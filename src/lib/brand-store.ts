import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandProductContentPayload } from "./brand-product-input";
import {
  getProductById,
  hydrateProductsWithDetailSections,
  mapProductRow,
  productSelect
} from "./commerce-store";
import { toProductDetailSectionRpcPayload } from "./product-detail-sections";
import type { OrderStatus } from "./commerce";
import type { Product } from "./products";
import { createSupabasePrivilegedClient } from "./supabase/admin";

export type BrandPartnerStatus = "active" | "paused" | "archived";
export type BrandMembershipStatus = "active" | "paused";
export type BrandMemberRole = "owner" | "editor" | "viewer";
export type BrandAssignmentStatus = "active" | "paused" | "archived";
export type BrandReportRange = "30d" | "90d" | "all";

export type BrandPartner = {
  id: string;
  name: string;
  slug: string;
  status: BrandPartnerStatus;
  contactEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BrandPartnerOption = Pick<BrandPartner, "id" | "name" | "slug" | "status" | "contactEmail">;

export type BrandMembership = {
  id: string;
  brandId: string;
  profileId: string;
  memberRole: BrandMemberRole;
  status: BrandMembershipStatus;
  email?: string;
  fullName?: string;
  brand?: BrandPartner;
  createdAt?: string;
};

export type ProductBrandAssignment = {
  id: string;
  brandId: string;
  productId: string;
  status: BrandAssignmentStatus;
  canEditDetails: boolean;
  createdAt?: string;
  product?: Product;
  brand?: BrandPartner;
};

export type BrandProductSummary = {
  product: Product;
  brand: BrandPartner;
  assignment: ProductBrandAssignment;
};

export type AdminBrandSummary = BrandPartner & {
  memberships: BrandMembership[];
  assignments: ProductBrandAssignment[];
};

export type BrandReportProductSummary = {
  productId: string;
  productName: string;
  unitsSold: number;
  grossSalesCents: number;
  estimatedSettlementCents: number;
};

export type BrandReportSummary = {
  range: BrandReportRange;
  totalOrders: number;
  unitsSold: number;
  grossSalesCents: number;
  estimatedSettlementCents: number;
  pendingSettlementCents: number;
  deliveredSalesCents: number;
  excludedSalesCents: number;
  products: BrandReportProductSummary[];
};

export type BrandReportOrderItemRow = {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total_cents: number;
  orders?: {
    id?: string;
    status?: string;
    created_at?: string;
  } | Array<{
    id?: string;
    status?: string;
    created_at?: string;
  }> | null;
};

type ProductRow = Parameters<typeof mapProductRow>[0];

export class BrandAccessDeniedError extends Error {
  status = 403;

  constructor(message = "Brand access required") {
    super(message);
  }
}

export class BrandProductNotFoundError extends Error {
  status = 404;

  constructor(message = "Brand product not found") {
    super(message);
  }
}

export class BrandInputError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
  }
}

export async function listBrandProductsForUser(userId: string): Promise<BrandProductSummary[]> {
  const supabase = createSupabasePrivilegedClient();
  const memberships = await listActiveBrandMembershipsForUser(supabase, userId);

  if (memberships.length === 0) {
    return [];
  }

  const brandIds = memberships.map((membership) => membership.brandId);
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("product_brand_assignments")
    .select("id,brand_partner_id,product_id,status,can_edit_details,created_at")
    .in("brand_partner_id", brandIds)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (assignmentError) {
    throw new Error(`Could not load brand product assignments: ${assignmentError.message}`);
  }

  const assignments = ((assignmentRows ?? []) as AssignmentRow[]).map(mapAssignmentRow);
  const productIds = [...new Set(assignments.map((assignment) => assignment.productId))];

  if (productIds.length === 0) {
    return [];
  }

  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select(productSelect)
    .in("id", productIds)
    .order("created_at", { ascending: false });

  if (productError) {
    throw new Error(`Could not load brand products: ${productError.message}`);
  }

  const hydratedProducts = await hydrateProductsWithDetailSections(
    supabase,
    ((productRows ?? []) as ProductRow[]).map(mapProductRow)
  );
  const products = new Map(hydratedProducts.map((product) => [product.id, product]));
  const brands = new Map(
    memberships
      .filter((membership): membership is BrandMembership & { brand: BrandPartner } => Boolean(membership.brand))
      .map((membership) => [membership.brandId, membership.brand])
  );

  return assignments.flatMap((assignment) => {
    const product = products.get(assignment.productId);
    const brand = brands.get(assignment.brandId);
    if (!product || !brand) {
      return [];
    }
    return [{ product, brand, assignment }];
  });
}

export async function listBrandMembershipsForUser(userId: string) {
  const supabase = createSupabasePrivilegedClient();
  return listActiveBrandMembershipsForUser(supabase, userId);
}

export async function getBrandProductForUser({
  userId,
  productId,
  requireEditable = false,
  requireEditor = false
}: {
  userId: string;
  productId: string;
  requireEditable?: boolean;
  requireEditor?: boolean;
}): Promise<BrandProductSummary> {
  const supabase = createSupabasePrivilegedClient();
  const memberships = await listActiveBrandMembershipsForUser(supabase, userId);

  if (memberships.length === 0) {
    throw new BrandAccessDeniedError();
  }

  const brandIds = memberships.map((membership) => membership.brandId);
  const { data: assignmentRow, error: assignmentError } = await supabase
    .from("product_brand_assignments")
    .select("id,brand_partner_id,product_id,status,can_edit_details,created_at")
    .eq("product_id", productId)
    .eq("status", "active")
    .in("brand_partner_id", brandIds)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`Could not load brand product assignment: ${assignmentError.message}`);
  }

  if (!assignmentRow) {
    throw new BrandProductNotFoundError();
  }

  const assignment = mapAssignmentRow(assignmentRow as AssignmentRow);
  if (requireEditable && !assignment.canEditDetails) {
    throw new BrandProductNotFoundError();
  }

  const membership = memberships.find((candidate) => candidate.brandId === assignment.brandId);
  if (requireEditor && !isEditorBrandRole(membership?.memberRole)) {
    throw new BrandAccessDeniedError("Brand editor access required");
  }

  const brand = membership?.brand;
  const product = await getProductById(productId, supabase);

  if (!brand || !product) {
    throw new BrandProductNotFoundError();
  }

  return { product, brand, assignment };
}

function isEditorBrandRole(role: BrandMemberRole | undefined) {
  return role === "owner" || role === "editor";
}

export async function updateBrandProductContentForUser({
  userId,
  productId,
  input
}: {
  userId: string;
  productId: string;
  input: BrandProductContentPayload;
}) {
  const supabase = createSupabasePrivilegedClient();
  await getBrandProductForUser({
    userId,
    productId,
    requireEditable: true
  });

  const { error: replaceError } = await supabase.rpc("replace_product_detail_sections", {
    p_product_id: productId,
    p_actor_id: userId,
    p_sections: toProductDetailSectionRpcPayload(input.sections)
  });

  if (replaceError) {
    if (isDetailSectionSetupMissingError(replaceError)) {
      throw new BrandInputError("상세 문서 저장 구조가 아직 적용되지 않았습니다. 최신 Supabase 마이그레이션을 적용해주세요.");
    }

    throw new Error(`Could not update brand product detail sections: ${replaceError.message}`);
  }

  const product = await getProductById(productId, supabase);
  if (!product) {
    throw new BrandProductNotFoundError();
  }

  return product;
}

export async function getBrandReportForUser({
  userId,
  range = "30d"
}: {
  userId: string;
  range?: BrandReportRange;
}): Promise<BrandReportSummary> {
  const brandProducts = await listBrandProductsForUser(userId);

  if (brandProducts.length === 0) {
    return emptyBrandReport(range);
  }

  const productIds = brandProducts.map((item) => item.product.id);
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id,product_id,product_name,quantity,line_total_cents,orders(id,status,created_at)")
    .in("product_id", productIds);

  if (error) {
    throw new Error(`Could not load brand report: ${error.message}`);
  }

  const since = getReportRangeStart(range);
  const rows = ((data ?? []) as BrandReportOrderItemRow[]).filter((row) => {
    if (!since) {
      return true;
    }
    const order = getRelationObject(row.orders);
    return order?.created_at ? order.created_at >= since : false;
  });

  return {
    ...buildBrandReportSummary({ productIds, rows }),
    range
  };
}

export function buildBrandReportSummary({
  productIds,
  rows
}: {
  productIds: string[];
  rows: BrandReportOrderItemRow[];
}): BrandReportSummary {
  const scopedProductIds = new Set(productIds);
  const orderIds = new Set<string>();
  const productSummaries = new Map<string, BrandReportProductSummary>();
  let unitsSold = 0;
  let grossSalesCents = 0;
  let pendingSettlementCents = 0;
  let deliveredSalesCents = 0;
  let excludedSalesCents = 0;

  for (const row of rows) {
    if (!row.product_id || !scopedProductIds.has(row.product_id)) {
      continue;
    }

    const order = getRelationObject(row.orders);
    if (!order) {
      continue;
    }

    const status = order.status as OrderStatus | undefined;
    if (!status) {
      continue;
    }

    if (status === "cancelled" || status === "refunded") {
      excludedSalesCents += row.line_total_cents;
      continue;
    }

    if (!isRevenueStatus(status)) {
      continue;
    }

    orderIds.add(order.id ?? row.order_id);
    unitsSold += row.quantity;
    grossSalesCents += row.line_total_cents;

    if (status === "delivered") {
      deliveredSalesCents += row.line_total_cents;
    } else {
      pendingSettlementCents += row.line_total_cents;
    }

    const current = productSummaries.get(row.product_id) ?? {
      productId: row.product_id,
      productName: row.product_name,
      unitsSold: 0,
      grossSalesCents: 0,
      estimatedSettlementCents: 0
    };
    current.unitsSold += row.quantity;
    current.grossSalesCents += row.line_total_cents;
    current.estimatedSettlementCents += row.line_total_cents;
    productSummaries.set(row.product_id, current);
  }

  return {
    range: "30d",
    totalOrders: orderIds.size,
    unitsSold,
    grossSalesCents,
    estimatedSettlementCents: grossSalesCents,
    pendingSettlementCents,
    deliveredSalesCents,
    excludedSalesCents,
    products: [...productSummaries.values()].sort(
      (first, second) => second.grossSalesCents - first.grossSalesCents
    )
  };
}

export async function listAdminBrands(): Promise<AdminBrandSummary[]> {
  const supabase = createSupabasePrivilegedClient();
  const { data: brandRows, error: brandError } = await supabase
    .from("brand_partners")
    .select("id,name,slug,status,contact_email,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (brandError) {
    throw new Error(`Could not load brands: ${brandError.message}`);
  }

  const brands = ((brandRows ?? []) as BrandPartnerRow[]).map(mapBrandPartnerRow);
  const brandIds = brands.map((brand) => brand.id);

  if (brandIds.length === 0) {
    return [];
  }

  const [membershipResult, assignmentResult] = await Promise.all([
    supabase
      .from("brand_memberships")
      .select("id,brand_partner_id,profile_id,member_role,status,created_at,profiles(email,full_name)")
      .in("brand_partner_id", brandIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("product_brand_assignments")
      .select("id,brand_partner_id,product_id,status,can_edit_details,created_at,products(id,name,brand_name,slug,status)")
      .in("brand_partner_id", brandIds)
      .order("created_at", { ascending: false })
  ]);

  if (membershipResult.error) {
    throw new Error(`Could not load brand members: ${membershipResult.error.message}`);
  }

  if (assignmentResult.error) {
    throw new Error(`Could not load brand assignments: ${assignmentResult.error.message}`);
  }

  const memberships = ((membershipResult.data ?? []) as MembershipRow[]).map(mapMembershipRow);
  const assignments = ((assignmentResult.data ?? []) as AssignmentRowWithProduct[]).map((row) => ({
    ...mapAssignmentRow(row),
    product: row.products ? mapAssignmentProduct(row.products) : undefined
  }));

  return brands.map((brand) => ({
    ...brand,
    memberships: memberships.filter((membership) => membership.brandId === brand.id),
    assignments: assignments.filter((assignment) => assignment.brandId === brand.id)
  }));
}

export async function listActiveBrandPartnerOptions(): Promise<BrandPartnerOption[]> {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("brand_partners")
    .select("id,name,slug,status,contact_email")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Could not load brand partner options: ${error.message}`);
  }

  return ((data ?? []) as BrandPartnerRow[]).map(mapBrandPartnerRow);
}

export async function getProductBrandAssignmentForAdmin(productId: string): Promise<ProductBrandAssignment | null> {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("product_brand_assignments")
    .select("id,brand_partner_id,product_id,status,can_edit_details,created_at,brand_partners(id,name,slug,status,contact_email,created_at,updated_at)")
    .eq("product_id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load product brand assignment: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as AssignmentRowWithBrand;
  const brand = getRelationObject(row.brand_partners);
  return {
    ...mapAssignmentRow(row),
    brand: brand ? mapBrandPartnerRow(brand) : undefined
  };
}

export async function createBrandPartner({
  name,
  slug,
  contactEmail
}: {
  name: string;
  slug?: string;
  contactEmail?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("brand_partners")
    .insert({
      name: name.trim(),
      slug: (slug?.trim() || slugify(name)).toLowerCase(),
      contact_email: contactEmail?.trim() || null,
      status: "active"
    })
    .select("id,name,slug,status,contact_email,created_at,updated_at")
    .single();

  if (error) {
    throw new BrandInputError(`브랜드를 생성하지 못했습니다: ${error.message}`);
  }

  return mapBrandPartnerRow(data as BrandPartnerRow);
}

export async function updateBrandPartner({
  brandId,
  status,
  contactEmail
}: {
  brandId: string;
  status?: BrandPartnerStatus;
  contactEmail?: string | null;
}) {
  const values: Record<string, string | null> = {};

  if (status) {
    values.status = status;
  }

  if (contactEmail !== undefined) {
    values.contact_email = contactEmail?.trim() || null;
  }

  if (Object.keys(values).length === 0) {
    throw new BrandInputError("변경할 브랜드 관리 항목이 없습니다.");
  }

  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("brand_partners")
    .update(values)
    .eq("id", brandId)
    .select("id,name,slug,status,contact_email,created_at,updated_at")
    .single();

  if (error) {
    throw new BrandInputError(`브랜드 상태를 변경하지 못했습니다: ${error.message}`);
  }

  return mapBrandPartnerRow(data as BrandPartnerRow);
}

export async function connectBrandMember({
  brandId,
  email,
  memberRole = "editor"
}: {
  brandId: string;
  email: string;
  memberRole?: BrandMemberRole;
}) {
  const supabase = createSupabasePrivilegedClient();
  const normalizedEmail = email.trim().toLowerCase();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load member profile: ${profileError.message}`);
  }

  if (!profile) {
    throw new BrandInputError("가입된 고객 계정을 먼저 생성한 뒤 브랜드 멤버로 연결해주세요.");
  }

  if (profile.role !== "customer") {
    throw new BrandInputError("일반 고객 계정만 브랜드 멤버로 연결할 수 있습니다.");
  }

  const { data, error } = await supabase
    .from("brand_memberships")
    .upsert(
      {
        brand_partner_id: brandId,
        profile_id: profile.id,
        member_role: memberRole,
        status: "active"
      },
      { onConflict: "brand_partner_id,profile_id" }
    )
    .select("id,brand_partner_id,profile_id,member_role,status,created_at")
    .single();

  if (error) {
    throw new BrandInputError(`브랜드 멤버를 연결하지 못했습니다: ${error.message}`);
  }

  return {
    ...mapMembershipRow(data as MembershipRow),
    email: profile.email as string | undefined,
    fullName: (profile.full_name as string | null) ?? undefined
  };
}

export async function updateBrandMembership({
  brandId,
  membershipId,
  memberRole,
  status
}: {
  brandId: string;
  membershipId: string;
  memberRole: BrandMemberRole;
  status: BrandMembershipStatus;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("brand_memberships")
    .update({
      member_role: memberRole,
      status
    })
    .eq("id", membershipId)
    .eq("brand_partner_id", brandId)
    .select("id,brand_partner_id,profile_id,member_role,status,created_at,profiles(email,full_name)")
    .single();

  if (error) {
    throw new BrandInputError(`브랜드 멤버를 변경하지 못했습니다: ${error.message}`);
  }

  return mapMembershipRow(data as MembershipRow);
}

export async function assignProductToBrand({
  brandId,
  productId,
  assignedBy
}: {
  brandId: string;
  productId: string;
  assignedBy: string;
}) {
  const assignment = await syncProductBrandAssignmentForProduct({
    brandId,
    productId,
    canEditDetails: true,
    assignedBy
  });

  if (!assignment) {
    throw new BrandInputError("상품을 브랜드에 배정하지 못했습니다.");
  }

  return assignment;
}

export async function syncProductBrandAssignmentForProduct({
  productId,
  brandId,
  canEditDetails = true,
  assignedBy
}: {
  productId: string;
  brandId: string | null;
  canEditDetails?: boolean;
  assignedBy: string;
}) {
  const supabase = createSupabasePrivilegedClient();

  if (!brandId) {
    const { error } = await supabase
      .from("product_brand_assignments")
      .update({ status: "archived" })
      .eq("product_id", productId)
      .eq("status", "active");

    if (error) {
      throw new BrandInputError(`상품의 브랜드 연결을 해제하지 못했습니다: ${error.message}`);
    }

    return null;
  }

  const [{ data: brand, error: brandError }, { data: product, error: productError }] = await Promise.all([
    supabase
      .from("brand_partners")
      .select("id")
      .eq("id", brandId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle()
  ]);

  if (brandError) {
    throw new Error(`Could not load brand partner: ${brandError.message}`);
  }

  if (productError) {
    throw new Error(`Could not load product: ${productError.message}`);
  }

  if (!brand) {
    throw new BrandInputError("활성 브랜드를 찾을 수 없습니다.");
  }

  if (!product) {
    throw new BrandInputError("배정할 상품을 찾을 수 없습니다.");
  }

  const { error: archiveError } = await supabase
    .from("product_brand_assignments")
    .update({ status: "archived" })
    .eq("product_id", productId)
    .eq("status", "active");

  if (archiveError) {
    throw new Error(`Could not archive existing brand assignment: ${archiveError.message}`);
  }

  const { data, error } = await supabase
    .from("product_brand_assignments")
    .upsert(
      {
        brand_partner_id: brandId,
        product_id: productId,
        status: "active",
        can_edit_details: canEditDetails,
        assigned_by: assignedBy
      },
      { onConflict: "brand_partner_id,product_id" }
    )
    .select("id,brand_partner_id,product_id,status,can_edit_details,created_at")
    .single();

  if (error) {
    throw new BrandInputError(`상품을 브랜드에 연결하지 못했습니다: ${error.message}`);
  }

  return mapAssignmentRow(data as AssignmentRow);
}

export async function updateProductBrandAssignment({
  brandId,
  assignmentId,
  status,
  canEditDetails
}: {
  brandId: string;
  assignmentId: string;
  status: BrandAssignmentStatus;
  canEditDetails: boolean;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { data: currentAssignment, error: currentError } = await supabase
    .from("product_brand_assignments")
    .select("id,product_id")
    .eq("id", assignmentId)
    .eq("brand_partner_id", brandId)
    .maybeSingle();

  if (currentError) {
    throw new Error(`Could not load brand assignment: ${currentError.message}`);
  }

  if (!currentAssignment) {
    throw new BrandInputError("변경할 상품 배정을 찾을 수 없습니다.");
  }

  if (status === "active") {
    const { error: archiveError } = await supabase
      .from("product_brand_assignments")
      .update({ status: "archived" })
      .eq("product_id", (currentAssignment as { product_id: string }).product_id)
      .eq("status", "active");

    if (archiveError) {
      throw new Error(`Could not archive existing brand assignment: ${archiveError.message}`);
    }
  }

  const { data, error } = await supabase
    .from("product_brand_assignments")
    .update({
      status,
      can_edit_details: canEditDetails
    })
    .eq("id", assignmentId)
    .eq("brand_partner_id", brandId)
    .select("id,brand_partner_id,product_id,status,can_edit_details,created_at")
    .single();

  if (error) {
    throw new BrandInputError(`상품 배정을 변경하지 못했습니다: ${error.message}`);
  }

  return mapAssignmentRow(data as AssignmentRow);
}

async function listActiveBrandMembershipsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<BrandMembership[]> {
  const { data, error } = await supabase
    .from("brand_memberships")
    .select("id,brand_partner_id,profile_id,member_role,status,created_at,brand_partners(id,name,slug,status,contact_email,created_at,updated_at)")
    .eq("profile_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load brand memberships: ${error.message}`);
  }

  return ((data ?? []) as MembershipRow[]).map(mapMembershipRow).filter(
    (membership) => membership.brand?.status === "active"
  );
}

function emptyBrandReport(range: BrandReportRange): BrandReportSummary {
  return {
    range,
    totalOrders: 0,
    unitsSold: 0,
    grossSalesCents: 0,
    estimatedSettlementCents: 0,
    pendingSettlementCents: 0,
    deliveredSalesCents: 0,
    excludedSalesCents: 0,
    products: []
  };
}

function getReportRangeStart(range: BrandReportRange) {
  if (range === "all") {
    return null;
  }

  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (range === "90d" ? 90 : 30));
  return date.toISOString();
}

function isRevenueStatus(status: OrderStatus) {
  return status === "paid" || status === "preparing" || status === "shipped" || status === "delivered";
}

type BrandPartnerRow = {
  id: string;
  name: string;
  slug: string;
  status: BrandPartnerStatus;
  contact_email?: string | null;
  created_at?: string;
  updated_at?: string;
};

type MembershipRow = {
  id: string;
  brand_partner_id: string;
  profile_id: string;
  member_role: BrandMemberRole;
  status: BrandMembershipStatus;
  created_at?: string;
  brand_partners?: BrandPartnerRow | BrandPartnerRow[] | null;
  profiles?: { email?: string | null; full_name?: string | null } | Array<{
    email?: string | null;
    full_name?: string | null;
  }> | null;
};

type AssignmentRow = {
  id: string;
  brand_partner_id: string;
  product_id: string;
  status: BrandAssignmentStatus;
  can_edit_details?: boolean | null;
  created_at?: string;
};

type AssignmentRowWithProduct = AssignmentRow & {
  products?: {
    id: string;
    name: string;
    brand_name: string;
    slug: string;
    status: Product["status"];
  } | Array<{
    id: string;
    name: string;
    brand_name: string;
    slug: string;
    status: Product["status"];
  }> | null;
};

type AssignmentRowWithBrand = AssignmentRow & {
  brand_partners?: BrandPartnerRow | BrandPartnerRow[] | null;
};

function mapBrandPartnerRow(row: BrandPartnerRow): BrandPartner {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    contactEmail: row.contact_email ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMembershipRow(row: MembershipRow): BrandMembership {
  const profile = getRelationObject(row.profiles);
  const brand = getRelationObject(row.brand_partners);
  return {
    id: row.id,
    brandId: row.brand_partner_id,
    profileId: row.profile_id,
    memberRole: row.member_role,
    status: row.status,
    email: profile?.email ?? undefined,
    fullName: profile?.full_name ?? undefined,
    brand: brand ? mapBrandPartnerRow(brand) : undefined,
    createdAt: row.created_at
  };
}

function mapAssignmentRow(row: AssignmentRow): ProductBrandAssignment {
  return {
    id: row.id,
    brandId: row.brand_partner_id,
    productId: row.product_id,
    status: row.status,
    canEditDetails: row.can_edit_details ?? true,
    createdAt: row.created_at
  };
}

function mapAssignmentProduct(
  row: NonNullable<AssignmentRowWithProduct["products"]>
): Product | undefined {
  const product = getRelationObject(row);
  if (!product) {
    return undefined;
  }

  return {
    id: product.id,
    slug: product.slug,
    productType: "single",
    brandName: product.brand_name,
    name: product.name,
    category: "Skincare",
    shortDescription: "",
    description: "",
	    heroImagePath: "/catalog-assets/admin-product-placeholder.svg",
	    badges: [],
	    tags: ["SKINCARE", "SINGLE"],
	    status: product.status,
    option: {
      id: `${product.id}_option`,
      name: "Default option",
      sku: "",
      priceCents: 0,
      stockQuantity: 0
    },
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: [],
    detailSections: []
  };
}

function isDetailSectionSetupMissingError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42883" ||
    (message.includes("replace_product_detail_sections") &&
      (message.includes("schema cache") ||
        message.includes("Could not find") ||
        message.includes("does not exist"))) ||
    (message.includes("product_detail_sections") &&
      (message.includes("schema cache") ||
        message.includes("Could not find") ||
        message.includes("does not exist")))
  );
}

function getRelationObject<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || `brand-${Date.now()}`
  );
}
