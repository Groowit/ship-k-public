import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_COMMISSION_RATE_BPS,
  OrderStatus,
  canTransitionOrderStatus,
  calculateCommissionCents,
  calculateOrderTotals,
  shouldCreateReferralCommission
} from "./commerce";
import { shouldAutoMarkShipped } from "./fulfillment";
import {
  Product,
  ProductCategory,
  ProductDifficulty,
  ProductGalleryImage,
  ProductIncludedItem,
  ProductRoutineStep,
  ProductStatus,
  ProductType
} from "./products";
import {
  normalizeProductDisclosureNotes,
  normalizeProductDisclosureNotesForStorage,
  type ProductDisclosureNotes
} from "./product-disclosure-notes";
import {
  mapProductDetailSectionRow,
  toProductDetailSectionRpcPayload,
  type ProductDetailSectionInput,
  type ProductDetailSectionRow
} from "./product-detail-sections";
import { buildProductReferralPath, normalizeReferralLandingPath } from "./referral";
import { createSupabasePrivilegedClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

type MutableProductInput = {
  productType: ProductType;
  brandName: string;
  name: string;
  category: ProductCategory;
  tags: string[];
  difficulty?: ProductDifficulty;
  itemCount?: number;
  shortDescription: string;
  description: string;
  bestFor?: string;
  result?: string;
  priceCents: number;
  stockQuantity: number;
  heroImagePath?: string;
  introVideoUrl?: string;
  optionName?: string;
  sku?: string;
  galleryImages: Array<Omit<ProductGalleryImage, "id">>;
  includedItems: Array<Omit<ProductIncludedItem, "id">>;
  routineSteps: Array<Omit<ProductRoutineStep, "id">>;
  contentBlocks: Array<Omit<Product["contentBlocks"][number], "id">>;
  disclosureNotes?: ProductDisclosureNotes;
  detailSections: ProductDetailSectionInput[];
  detailActorId?: string;
  status: ProductStatus;
};

export type ShippingAddressInput = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  memo?: string;
};

export type DefaultShippingAddressInput = Omit<ShippingAddressInput, "email">;

export type CustomerAccountUpdateInput = {
  userId: string;
  fullName: string;
  phone: string;
  marketingOptIn: boolean;
  defaultShippingAddress: DefaultShippingAddressInput;
};

export type CommerceOrder = {
  id: string;
  userId: string;
  orderItemId?: string;
  productId?: string;
  orderNumber: string;
  productSlug: string;
  productName: string;
  optionName: string;
  quantity: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: "USD";
  status: OrderStatus;
  paymentProvider: "paypal";
  paymentProviderOrderId: string;
  referralCode?: string;
  shippingAddress: ShippingAddressInput;
  shipmentCarrier?: string;
  trackingNumber?: string;
  createdAt: string;
};

export type CheckoutSession = {
  id: string;
  userId: string;
  productId: string;
  productSlug: string;
  quantity: number;
  totalCents: number;
  currency: "USD";
  nonce: string;
  providerOrderId?: string;
  status: "created" | "paypal_order_created" | "captured" | "expired";
  expiresAt: string;
};

export type CommerceCommission = {
  id: string;
  orderId: string;
  referralCode: string;
  linkToken?: string;
  baseCents: number;
  rateBps: number;
  amountCents: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  holdUntil: string;
};

export type AffiliateStatus = "active" | "paused" | "blocked";
export type AffiliateLinkStatus = "active" | "paused";
export type PromoterDateRange = "7d" | "30d" | "all";

export type PromoterAffiliate = {
  id: string;
  profileId: string | null;
  code: string;
  displayName: string;
  status: AffiliateStatus;
  termsAcceptedAt: string | null;
  createdAt: string;
};

export type PromoterLinkSummary = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  status: AffiliateLinkStatus;
  linkToken: string;
  referralPath: string;
  totalClicks: number;
  uniqueClicks: number;
  orders: number;
  salesCents: number;
  commissionCents: number;
};

export type PromoterCommissionRow = {
  id: string;
  orderNumber: string;
  productName: string;
  linkToken?: string;
  baseCents: number;
  amountCents: number;
  status: CommerceCommission["status"];
  holdUntil: string;
};

export type PromoterDashboard = {
  affiliate: PromoterAffiliate | null;
  range: PromoterDateRange;
  schemaReady: boolean;
  summary: {
    totalClicks: number;
    uniqueClicks: number;
    orders: number;
    salesCents: number;
    pendingCommissionCents: number;
    approvedCommissionCents: number;
    paidCommissionCents: number;
  };
  links: PromoterLinkSummary[];
  commissions: PromoterCommissionRow[];
};

export type AdminAffiliateSummary = PromoterAffiliate & {
  email: string | null;
  totalClicks: number;
  uniqueClicks: number;
  orders: number;
  commissionCents: number;
};

export type AdminCommissionDetail = CommerceCommission & {
  orderNumber: string;
  productName: string;
  createdAt: string;
};

export type AdminCommissionSettlement = {
  affiliateId: string;
  profileId: string | null;
  code: string;
  displayName: string;
  email: string | null;
  status: AffiliateStatus | "unknown";
  createdAt: string | null;
  termsAcceptedAt: string | null;
  commissionCount: number;
  orders: number;
  salesBaseCents: number;
  totalCommissionCents: number;
  unpaidCommissionCents: number;
  paidCommissionCents: number;
  cancelledCommissionCents: number;
  commissions: AdminCommissionDetail[];
};

export class CommissionStatusUpdateError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 409) {
    super(message);
    this.name = "CommissionStatusUpdateError";
    this.statusCode = statusCode;
  }
}

export class PaymentReferenceConflictError extends Error {
  statusCode = 409;

  constructor() {
    super("Payment reference is already linked to another account");
    this.name = "PaymentReferenceConflictError";
  }
}

export type CommissionStatusAction = {
  status: CommerceCommission["status"];
  label: string;
  disabledReason?: string;
  requiresConfirmation: boolean;
};

type ProductOptionRow = {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
  stock_quantity: number;
};

export type ProductRow = {
  id: string;
  brand_name: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  hero_image_path: string | null;
  status: "active" | "draft" | "archived";
  badges: string[] | null;
  tags?: string[] | null;
  product_type: ProductType | "curated_set" | null;
  difficulty: ProductDifficulty | null;
  item_count: number | null;
  intro_video_url: string | null;
  best_for: string | null;
  result: string | null;
  disclosure_notes?: unknown;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | Array<{ name: string }> | null;
  product_options?: ProductOptionRow[] | null;
  product_images?: Array<{
    id: string;
    sort_order: number;
    image_path: string;
    alt_text: string;
  }> | null;
  product_included_items?: Array<{
    id: string;
    sort_order: number;
    name: string;
    category: string;
    description: string;
  }> | null;
  product_routine_steps?: Array<{
    id: string;
    sort_order: number;
    title: string;
    body: string;
  }> | null;
  product_content_blocks?: Array<{
    id: string;
    type: "image" | "text" | "image_text";
    sort_order: number;
    title: string | null;
    eyebrow: string | null;
    body: string | null;
    image_path: string | null;
    image_alt: string | null;
    image_position: "left" | "right" | null;
  }> | null;
  product_detail_sections?: ProductDetailSectionRow[] | null;
};

type ProductDetailSectionHydrationRow = ProductDetailSectionRow & {
  product_id: string;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  order_number: string;
  status: OrderStatus;
  currency: "USD";
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  referral_code: string | null;
  created_at: string;
  order_items?: Array<{
    id?: string;
    product_name: string;
    option_name: string;
    quantity: number;
    product_id: string | null;
    products?: { slug: string } | Array<{ slug: string }> | null;
  }> | null;
  shipping_addresses?: Array<{
    name: string;
    email: string;
    phone: string | null;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    memo: string | null;
  }> | null;
  shipments?: Array<{
    carrier: string | null;
    tracking_number: string | null;
  }> | null;
  payment_transactions?: Array<{
    provider_order_id: string;
  }> | null;
};

type CheckoutSessionRow = {
  id: string;
  user_id: string;
  product_id: string;
  product_slug: string;
  quantity: number;
  total_cents: number;
  currency: "USD";
  nonce: string;
  provider_order_id: string | null;
  status: CheckoutSession["status"];
  expires_at: string;
};

type AffiliateRow = {
  id: string;
  profile_id: string | null;
  code: string;
  display_name: string;
  status: AffiliateStatus;
  terms_accepted_at: string | null;
  created_at: string;
  profiles?: { email: string | null; phone?: string | null } | Array<{
    email: string | null;
    phone?: string | null;
  }> | null;
};

type AffiliateLinkRow = {
  id: string;
  product_id: string;
  link_token: string;
  destination_path: string;
  status: AffiliateLinkStatus;
  products?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
};

type ReferralEventRow = {
  id: string;
  affiliate_id: string;
  affiliate_link_id: string | null;
  anonymous_id: string | null;
  clicked_at: string;
};

type CommissionDashboardRow = {
  id: string;
  affiliate_id: string;
  affiliate_link_id: string | null;
  order_id: string;
  base_cents: number;
  amount_cents: number;
  status: CommerceCommission["status"];
  hold_until: string;
  order_number?: string | null;
  product_name?: string | null;
  link_token?: string | null;
};

type AdminCommissionQueryRow = {
  id: string;
  affiliate_id: string | null;
  affiliate_link_id: string | null;
  order_id: string;
  base_cents: number;
  rate_bps: number;
  amount_cents: number;
  status: CommerceCommission["status"];
  hold_until: string;
  created_at: string;
  orders?: {
    order_number?: string | null;
    referral_code?: string | null;
    order_items?: Array<{ product_name?: string | null }> | null;
  } | Array<{
    order_number?: string | null;
    referral_code?: string | null;
    order_items?: Array<{ product_name?: string | null }> | null;
  }> | null;
  affiliate_links?: { link_token?: string | null } | Array<{ link_token?: string | null }> | null;
  affiliates?: AffiliateRow | AffiliateRow[] | null;
};

const PROMOTER_SCHEMA_SETUP_MESSAGE =
  "Promoter portal setup is pending. Apply the latest Supabase migration before using applications and product links.";

export const productSelect = `
  id,
  brand_name,
  name,
  slug,
  short_description,
  description,
  hero_image_path,
  status,
  badges,
  tags,
  product_type,
  difficulty,
  item_count,
  intro_video_url,
  best_for,
  result,
  created_at,
  updated_at,
  categories(name),
  product_options(id,name,sku,price_cents,stock_quantity),
  product_images(id,sort_order,image_path,alt_text),
  product_included_items(id,sort_order,name,category,description),
  product_routine_steps(id,sort_order,title,body),
  product_content_blocks(id,type,sort_order,title,eyebrow,body,image_path,image_alt,image_position)
`;

const orderSelect = `
  id,
  user_id,
  order_number,
  status,
  currency,
  subtotal_cents,
  shipping_cents,
  total_cents,
  referral_code,
  created_at,
  order_items(id,product_name,option_name,quantity,product_id,products(slug)),
  shipping_addresses(name,email,phone,address1,address2,city,state,postal_code,country,memo),
  shipments(carrier,tracking_number),
  payment_transactions(provider_order_id)
`;

const trackingUrlBuilders: Record<string, (trackingNumber: string) => string> = {
  usps: (trackingNumber) =>
    `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(
      trackingNumber
    )}`,
  ups: (trackingNumber) =>
    `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`,
  fedex: (trackingNumber) =>
    `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`,
  dhl: (trackingNumber) =>
    `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(
      trackingNumber
    )}`
};

export async function listProducts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load products: ${error.message}`);
  }

  const products = await hydrateProductsWithDetailSections(supabase, (data as ProductRow[]).map(mapProductRow));
  return decorateProductsWithAutomaticMerchandising(products);
}

export async function listActiveProducts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load active products: ${error.message}`);
  }

  const products = await hydrateProductsWithDetailSections(supabase, (data as ProductRow[]).map(mapProductRow));
  return decorateProductsWithAutomaticMerchandising(products);
}

export function sortProductsByPopularity(products: Product[]) {
  return [...products].sort(compareProductPopularity);
}

export async function findProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const lookupSlug = normalizeProductSlug(slug);
  const normalizedSlug = normalizeLegacyProductSlug(lookupSlug);
  const legacySlug = canonicalToLegacySlug[normalizedSlug];
  const candidateSlugs = [...new Set([lookupSlug, normalizedSlug, legacySlug].filter(Boolean))];
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .in("slug", candidateSlugs)
    .eq("status", "active");

  if (error) {
    throw new Error(`Could not load product: ${error.message}`);
  }

  const rows = asArray(data as ProductRow[] | ProductRow | null);
  const row =
    rows.find((product) => normalizeProductSlug(product.slug) === normalizedSlug) ??
    rows.find((product) => normalizeProductSlug(product.slug) === lookupSlug) ??
    rows.find((product) => normalizeLegacyProductSlug(product.slug) === normalizedSlug) ??
    rows[0];

  if (!row) {
    return undefined;
  }

  const [product] = await hydrateProductsWithDetailSections(supabase, [mapProductRow(row)]);
  const [decoratedProduct] = await decorateProductsWithAutomaticMerchandising([product]);
  return decoratedProduct;
}

export async function getProductForAdmin(productId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load admin product: ${error.message}`);
  }

  if (!data) {
    return undefined;
  }

  const [product] = await hydrateProductsWithDetailSections(supabase, [mapProductRow(data as ProductRow)]);
  const [decoratedProduct] = await decorateProductsWithAutomaticMerchandising([product]);
  return decoratedProduct;
}

type ProductMerchandisingRow = {
  id: string;
  created_at: string | null;
};

type ProductSalesMetricRow = {
  product_id: string | null;
  quantity: number | null;
  orders?: { status?: OrderStatus | null; created_at?: string | null } | Array<{
    status?: OrderStatus | null;
    created_at?: string | null;
  }> | null;
};

type ProductMerchandisingMetric = {
  id: string;
  createdAt?: string;
  lastOrderedAt?: string;
  recentSalesCount: number;
  salesCount: number;
};

const positiveOrderStatuses = new Set<OrderStatus>(["paid", "preparing", "shipped", "delivered"]);
const recentSalesWindowMs = 7 * 24 * 60 * 60 * 1000;
const newArrivalWindowMs = 30 * 24 * 60 * 60 * 1000;

async function decorateProductsWithAutomaticMerchandising(products: Product[]) {
  if (products.length === 0) {
    return products;
  }

  try {
    const metrics = await loadProductMerchandisingMetrics();
    const decoratedProducts = applyAutomaticMarketingBadges(products, metrics);
    return decoratedProducts;
  } catch {
    return products.map((product) => ({
      ...product,
      badges: []
    }));
  }
}

async function loadProductMerchandisingMetrics() {
  const supabase = createSupabasePrivilegedClient();
  const { data: activeRows, error: activeError } = await supabase
    .from("products")
    .select("id,created_at")
    .eq("status", "active");

  if (activeError) {
    throw activeError;
  }

  const rows = (activeRows ?? []) as ProductMerchandisingRow[];
  const metrics = new Map<string, ProductMerchandisingMetric>();

  rows.forEach((row) => {
    metrics.set(row.id, {
      id: row.id,
      createdAt: row.created_at ?? undefined,
      recentSalesCount: 0,
      salesCount: 0
    });
  });

  const productIds = rows.map((row) => row.id);
  if (productIds.length === 0) {
    return metrics;
  }

  const { data: salesRows, error: salesError } = await supabase
    .from("order_items")
    .select("product_id,quantity,orders(status,created_at)")
    .in("product_id", productIds);

  if (salesError) {
    throw salesError;
  }

  ((salesRows ?? []) as ProductSalesMetricRow[]).forEach((row) => {
    if (!row.product_id) {
      return;
    }

    const order = getRelationObject<{ status?: OrderStatus | null; created_at?: string | null }>(
      row.orders as never
    );

    if (!order?.status || !positiveOrderStatuses.has(order.status)) {
      return;
    }

    const metric = metrics.get(row.product_id);
    if (!metric) {
      return;
    }

    const quantity = row.quantity ?? 0;
    metric.salesCount += quantity;
    if (isRecent(order.created_at ?? undefined, recentSalesWindowMs)) {
      metric.recentSalesCount += quantity;
    }
    if (isAfter(order.created_at, metric.lastOrderedAt)) {
      metric.lastOrderedAt = order.created_at ?? undefined;
    }
  });

  return metrics;
}

function applyAutomaticMarketingBadges(
  products: Product[],
  metrics: Map<string, ProductMerchandisingMetric>
) {
  const rankedMetrics = [...metrics.values()].sort(compareMerchandisingMetrics);
  const bestSeller = rankedMetrics.find((metric) => metric.salesCount > 0);
  const newArrival = [...metrics.values()]
    .filter((metric) => isRecent(metric.createdAt, newArrivalWindowMs))
    .sort((a, b) => compareDateDesc(a.createdAt, b.createdAt))[0];
  const rankById = new Map(rankedMetrics.map((metric, index) => [metric.id, index + 1]));

  return products.map((product) => {
    const metric = metrics.get(product.id);
    const badges: string[] = [];

    if (bestSeller?.id === product.id) {
      badges.push("BESTSELLER");
    }

    if (newArrival?.id === product.id) {
      badges.push("NEW ARRIVAL");
    }

    return {
      ...product,
      badges: product.status === "active" ? badges : [],
      createdAt: metric?.createdAt ?? product.createdAt,
      lastOrderedAt: metric?.lastOrderedAt ?? product.lastOrderedAt,
      recentSalesCount: metric?.recentSalesCount ?? product.recentSalesCount ?? 0,
      salesCount: metric?.salesCount ?? product.salesCount ?? 0,
      popularityRank: rankById.get(product.id) ?? product.popularityRank
    };
  });
}

function compareProductPopularity(a: Product, b: Product) {
  return (
    (b.salesCount ?? 0) - (a.salesCount ?? 0) ||
    compareDateDesc(a.lastOrderedAt, b.lastOrderedAt) ||
    compareDateDesc(a.createdAt, b.createdAt) ||
    a.name.localeCompare(b.name)
  );
}

function compareMerchandisingMetrics(a: ProductMerchandisingMetric, b: ProductMerchandisingMetric) {
  return (
    b.salesCount - a.salesCount ||
    compareDateDesc(a.lastOrderedAt, b.lastOrderedAt) ||
    compareDateDesc(a.createdAt, b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

function compareDateDesc(a?: string | null, b?: string | null) {
  return getTime(b) - getTime(a);
}

function isAfter(next?: string | null, current?: string | null) {
  return getTime(next) > getTime(current);
}

function isRecent(value: string | undefined, windowMs: number) {
  const time = getTime(value);
  return time > 0 && Date.now() - time <= windowMs;
}

function getTime(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export async function createProduct(input: MutableProductInput) {
  const supabase = createSupabasePrivilegedClient();
  const slug = slugify(`${input.brandName}-${input.name}`);
  const itemCount = input.itemCount ?? input.includedItems.length;
  const heroImagePath = input.heroImagePath || "/catalog-assets/admin-product-placeholder.svg";
  let productId: string | null = null;

  try {
    const categoryId = await findOrCreateCategoryId(supabase, input.category);
    let { data: product, error: productError } = await supabase
      .from("products")
      .insert(buildProductMutation(input, categoryId, itemCount, heroImagePath, { slug }))
      .select("id")
      .single();

    if (productError && shouldRetryLegacyProductType(productError, input.productType)) {
      const retry = await supabase
        .from("products")
        .insert(buildProductMutation(input, categoryId, itemCount, heroImagePath, { slug, useLegacySetType: true }))
        .select("id")
        .single();
      product = retry.data;
      productError = retry.error;
    }

    if (productError) {
      throw productError;
    }

    if (!product) {
      throw new Error("Product was saved without an id");
    }

    productId = product.id as string;

    await insertRequired(supabase, "product_options", {
      product_id: productId,
      name:
        input.optionName ||
        (input.productType === "set" ? `${itemCount}-item set` : "Default option"),
      sku: input.sku || slug.toUpperCase().replace(/-/g, "-").slice(0, 24),
      price_cents: input.priceCents,
      stock_quantity: input.stockQuantity
    });

    await replaceProductChildren(supabase, productId, input, heroImagePath);
    await replaceProductDetailSectionsIfNeeded(supabase, productId, input);

    const savedProductId = productId;
    if (!savedProductId) {
      throw new Error("Product was saved without an id");
    }

    const created = await getProductById(savedProductId, supabase);
    if (!created) {
      throw new Error("Product was saved but could not be reloaded");
    }
    return created;
  } catch (error) {
    if (productId) {
      await supabase.from("products").delete().eq("id", productId);
    }
    throw new Error(getErrorMessage(error, "Could not save product"));
  }
}

export async function updateProduct(productId: string, input: MutableProductInput) {
  const supabase = createSupabasePrivilegedClient();
  const existing = await getProductById(productId, supabase);

  if (!existing) {
    throw new Error("Product not found");
  }

  const itemCount = input.itemCount ?? input.includedItems.length;
  const heroImagePath = input.heroImagePath || "/catalog-assets/admin-product-placeholder.svg";

  try {
    const categoryId = await findOrCreateCategoryId(supabase, input.category);
    let { error: productError } = await supabase
      .from("products")
      .update(buildProductMutation(input, categoryId, itemCount, heroImagePath))
      .eq("id", productId);

    if (productError && shouldRetryLegacyProductType(productError, input.productType)) {
      const retry = await supabase
        .from("products")
        .update(buildProductMutation(input, categoryId, itemCount, heroImagePath, { useLegacySetType: true }))
        .eq("id", productId);
      productError = retry.error;
    }

    if (productError) {
      throw productError;
    }

    await upsertPrimaryOption(supabase, productId, input, itemCount, existing.slug);
    await replaceProductChildren(supabase, productId, input, heroImagePath);
    await replaceProductDetailSectionsIfNeeded(supabase, productId, input);

    const updated = await getProductById(productId, supabase);
    if (!updated) {
      throw new Error("Product was updated but could not be reloaded");
    }
    return updated;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Could not update product"));
  }
}

export async function archiveProduct(productId: string) {
  const supabase = createSupabasePrivilegedClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", productId);

  if (error) {
    throw new Error(`Could not archive product: ${error.message}`);
  }
}

export async function deleteProduct(productId: string) {
  const supabase = createSupabasePrivilegedClient();

  const { error: orderItemsError } = await supabase
    .from("order_items")
    .update({ product_id: null, product_option_id: null })
    .eq("product_id", productId);

  if (orderItemsError) {
    throw new Error(`Could not detach product order history: ${orderItemsError.message}`);
  }

  const { error: checkoutSessionsError } = await supabase
    .from("checkout_sessions")
    .delete()
    .eq("product_id", productId);

  if (checkoutSessionsError) {
    throw new Error(`Could not delete product checkout sessions: ${checkoutSessionsError.message}`);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    throw new Error(`Could not delete product: ${error.message}`);
  }
}

function buildProductMutation(
  input: MutableProductInput,
  categoryId: string,
  itemCount: number,
  heroImagePath: string,
  options: { slug?: string; useLegacySetType?: boolean } = {}
) {
  return {
    ...(options.slug ? { slug: options.slug } : {}),
    category_id: categoryId,
    brand_name: input.brandName,
    name: input.name,
    short_description: input.shortDescription,
    description: input.description,
    hero_image_path: heroImagePath,
    status: input.status,
    badges: [],
    tags: normalizeProductTagList(input.tags).length
      ? normalizeProductTagList(input.tags)
      : inferInputProductTags(input, itemCount),
    product_type: options.useLegacySetType && input.productType === "set" ? "curated_set" : input.productType,
    difficulty: input.difficulty ?? null,
    item_count: itemCount || null,
    intro_video_url: input.introVideoUrl || null,
    best_for: input.bestFor || null,
    result: input.result || null,
    disclosure_notes: normalizeProductDisclosureNotesForStorage(input.disclosureNotes)
  };
}

function shouldRetryLegacyProductType(error: unknown, productType: ProductType) {
  if (productType !== "set") {
    return false;
  }

  const message = getErrorMessage(error, "");
  return message.includes("product_type") && message.includes("set");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export async function createCheckoutSession({
  userId,
  productId,
  productSlug,
  quantity,
  totalCents,
  currency = "USD",
  now = new Date()
}: {
  userId: string;
  productId: string;
  productSlug: string;
  quantity: number;
  totalCents: number;
  currency?: "USD";
  now?: Date;
}) {
  const supabase = createSupabasePrivilegedClient();
  const expiresAt = new Date(now);
  expiresAt.setUTCMinutes(expiresAt.getUTCMinutes() + 30);

  const { data, error } = await supabase
    .from("checkout_sessions")
    .insert({
      user_id: userId,
      product_id: productId,
      product_slug: productSlug,
      quantity,
      total_cents: totalCents,
      currency,
      nonce: createSecureRandomToken(32),
      status: "created",
      expires_at: expiresAt.toISOString()
    })
    .select(
      "id,user_id,product_id,product_slug,quantity,total_cents,currency,nonce,provider_order_id,status,expires_at"
    )
    .single();

  if (error) {
    throw new Error(`Could not create checkout session: ${error.message}`);
  }

  return mapCheckoutSessionRow(data as CheckoutSessionRow);
}

export async function bindCheckoutSessionPayment({
  sessionId,
  providerOrderId
}: {
  sessionId: string;
  providerOrderId: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .update({
      provider: "paypal",
      provider_order_id: providerOrderId,
      status: "paypal_order_created",
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .eq("status", "created")
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not bind checkout session payment: ${error.message}`);
  }
  if (!data) {
    throw new Error("Could not bind checkout session payment");
  }
}

export async function findCheckoutSessionForCapture({
  userId,
  providerOrderId,
  expectedCustomId,
  productId,
  quantity,
  totalCents,
  now = new Date()
}: {
  userId: string;
  providerOrderId: string;
  expectedCustomId: string;
  productId: string;
  quantity: number;
  totalCents: number;
  now?: Date;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select(
      "id,user_id,product_id,product_slug,quantity,total_cents,currency,nonce,provider_order_id,status,expires_at"
    )
    .eq("user_id", userId)
    .eq("provider", "paypal")
    .eq("provider_order_id", providerOrderId)
    .eq("status", "paypal_order_created")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load checkout session: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const session = mapCheckoutSessionRow(data as CheckoutSessionRow);
  const expiresAt = Date.parse(session.expiresAt);
  if (
    session.productId !== productId ||
    session.quantity !== quantity ||
    session.totalCents !== totalCents ||
    session.currency !== "USD" ||
    getCheckoutSessionCustomId(session) !== expectedCustomId ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now.getTime()
  ) {
    return null;
  }

  return session;
}

export function getCheckoutSessionCustomId(session: Pick<CheckoutSession, "id" | "nonce">) {
  return `${session.id}:${session.nonce}`;
}

export async function createPaidOrder({
  userId,
  product,
  quantity,
  shippingAddress,
  paymentProviderOrderId,
  paymentProviderCaptureId,
  paymentStatus = "COMPLETED",
  paymentPayload = {},
  referralCode,
  referralLinkToken,
  referralLandingPath
}: {
  userId: string;
  product: Product;
  quantity: number;
  shippingAddress: ShippingAddressInput;
  paymentProviderOrderId: string;
  paymentProviderCaptureId?: string;
  paymentStatus?: string;
  paymentPayload?: unknown;
  referralCode?: string;
  referralLinkToken?: string;
  referralLandingPath?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const existingOrder = await getOrderByPaymentReference(supabase, {
    providerOrderId: paymentProviderOrderId,
    providerCaptureId: paymentProviderCaptureId
  });

  if (existingOrder) {
    if (existingOrder.userId !== userId) {
      throw new PaymentReferenceConflictError();
    }
    return existingOrder;
  }

  const totals = calculateOrderTotals([
    {
      unitPriceCents: product.option.priceCents,
      quantity
    }
  ]);
  let referral: Awaited<ReturnType<typeof findActiveReferral>> = null;
  if (referralCode && referralLinkToken && referralLandingPath) {
    try {
      referral = await findActiveReferral(
        supabase,
        referralCode,
        referralLinkToken,
        referralLandingPath
      );
    } catch (error) {
      if (!isPromoterSchemaMissingError(error)) {
        throw error;
      }
    }
  }
  const validReferralCode =
    referral &&
    shouldCreateReferralCommission({
      affiliateProfileId: referral.profileId,
      orderUserId: userId,
      affiliateStatus: referral.status,
      linkStatus: referral.linkStatus,
      affiliateEmail: referral.email,
      orderEmail: shippingAddress.email,
      affiliatePhone: referral.phone,
      orderPhone: shippingAddress.phone
    })
      ? referral.code
      : undefined;
  const commissionReferralLinkId =
    validReferralCode && referral
      ? (await findOrCreateActiveAffiliateProductLink(supabase, referral.id, product))?.linkId ??
        null
      : null;
  const orderNumber = createOrderNumber();
  let orderId: string | null = null;

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: "paid",
        currency: totals.currency,
        subtotal_cents: totals.subtotalCents,
        shipping_cents: totals.shippingCents,
        tax_cents: 0,
        discount_cents: 0,
        total_cents: totals.totalCents,
        referral_code: validReferralCode ?? null
      })
      .select("id")
      .single();

    if (orderError) {
      throw orderError;
    }

    orderId = order.id;

    await insertRequired(supabase, "order_items", {
      order_id: orderId,
      product_id: product.id,
      product_option_id: product.option.id,
      product_name: product.name,
      option_name: product.option.name,
      sku: product.option.sku,
      unit_price_cents: product.option.priceCents,
      quantity,
      line_total_cents: product.option.priceCents * quantity
    });

    await insertRequired(supabase, "shipping_addresses", {
      order_id: orderId,
      name: shippingAddress.name,
      email: shippingAddress.email,
      phone: shippingAddress.phone,
      address1: shippingAddress.address1,
      address2: shippingAddress.address2 ?? null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postalCode,
      country: shippingAddress.country,
      memo: shippingAddress.memo ?? null
    });

    try {
      await insertRequired(supabase, "payment_transactions", {
        order_id: orderId,
        provider: "paypal",
        provider_order_id: paymentProviderOrderId,
        provider_capture_id: paymentProviderCaptureId ?? null,
        status: paymentStatus,
        amount_cents: totals.totalCents,
        raw_payload: paymentPayload
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const racedOrder = await getOrderByPaymentReference(supabase, {
          providerOrderId: paymentProviderOrderId,
          providerCaptureId: paymentProviderCaptureId
        });
        if (racedOrder) {
          await supabase.from("orders").delete().eq("id", orderId);
          orderId = null;
          if (racedOrder.userId !== userId) {
            throw new PaymentReferenceConflictError();
          }
          return racedOrder;
        }
      }
      throw error;
    }

    if (validReferralCode && referral) {
      const holdUntil = new Date();
      holdUntil.setUTCDate(holdUntil.getUTCDate() + 30);
      try {
        await insertRequired(supabase, "commissions", {
          affiliate_id: referral.id,
          affiliate_link_id: commissionReferralLinkId,
          order_id: orderId,
          base_cents: totals.subtotalCents,
          rate_bps: DEFAULT_COMMISSION_RATE_BPS,
          amount_cents: calculateCommissionCents({
            productNetCents: totals.subtotalCents
          }),
          status: "pending",
          hold_until: holdUntil.toISOString()
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          const saved = await getOrderById(orderId as string, supabase);
          if (saved) {
            return saved;
          }
        }
        throw error;
      }
    }

    const saved = await getOrderById(orderId as string, supabase);
    if (!saved) {
      throw new Error("Order was saved but could not be reloaded");
    }
    return saved;
  } catch (error) {
    if (orderId) {
      await supabase.from("orders").delete().eq("id", orderId);
    }
    if (error instanceof PaymentReferenceConflictError) {
      throw error;
    }
    throw new Error(getErrorMessage(error, "Could not save order"));
  }
}

export async function listOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load orders: ${error.message}`);
  }

  return (data as OrderRow[]).map(mapOrderRow);
}

export async function listOrdersByUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load user orders: ${error.message}`);
  }

  return (data as OrderRow[]).map(mapOrderRow);
}

export async function getOrderByUser({
  orderId,
  userId
}: {
  orderId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load user order: ${error.message}`);
  }

  return data ? mapOrderRow(data as OrderRow) : undefined;
}

export async function updateCustomerAccount({
  userId,
  fullName,
  phone,
  marketingOptIn,
  defaultShippingAddress
}: CustomerAccountUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: normalizeNullableString(fullName),
      phone: normalizeNullableString(phone),
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? now : null,
      default_shipping_name: normalizeNullableString(defaultShippingAddress.name),
      default_shipping_phone: normalizeNullableString(defaultShippingAddress.phone),
      default_shipping_address1: normalizeNullableString(defaultShippingAddress.address1),
      default_shipping_address2: normalizeNullableString(defaultShippingAddress.address2),
      default_shipping_city: normalizeNullableString(defaultShippingAddress.city),
      default_shipping_state: normalizeNullableString(defaultShippingAddress.state),
      default_shipping_postal_code: normalizeNullableString(
        defaultShippingAddress.postalCode
      ),
      default_shipping_country: defaultShippingAddress.country,
      default_shipping_memo: normalizeNullableString(defaultShippingAddress.memo)
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Could not update account: ${error.message}`);
  }
}

export function getTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
) {
  const normalizedCarrier = carrier?.trim().toLowerCase();
  const normalizedTrackingNumber = trackingNumber?.trim();
  if (!normalizedCarrier || !normalizedTrackingNumber) {
    return undefined;
  }

  return trackingUrlBuilders[normalizedCarrier]?.(normalizedTrackingNumber);
}

export async function listCommissions() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commissions")
    .select(
      "id,order_id,base_cents,rate_bps,amount_cents,status,hold_until,orders(referral_code),affiliate_links(link_token)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (isPromoterSchemaMissingError(error)) {
      return listCommissionsWithoutPromoterLinks(supabase);
    }
    throw new Error(`Could not load commissions: ${error.message}`);
  }

  return data.map((commission) => ({
    id: commission.id,
    orderId: commission.order_id,
    referralCode: getRelationObject<{ referral_code: string | null }>(commission.orders)?.referral_code ?? "",
    linkToken: getRelationObject<{ link_token: string | null }>(commission.affiliate_links)?.link_token ?? undefined,
    baseCents: commission.base_cents,
    rateBps: commission.rate_bps,
    amountCents: commission.amount_cents,
    status: commission.status,
    holdUntil: commission.hold_until
  })) as CommerceCommission[];
}

export async function listAdminCommissionSettlements(): Promise<AdminCommissionSettlement[]> {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("commissions")
    .select(
      "id,affiliate_id,affiliate_link_id,order_id,base_cents,rate_bps,amount_cents,status,hold_until,created_at,orders(order_number,referral_code,order_items(product_name)),affiliate_links(link_token),affiliates(id,profile_id,code,display_name,status,terms_accepted_at,created_at,profiles(email))"
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (isPromoterSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load commission settlements: ${error.message}`);
  }

  return buildAdminCommissionSettlements((data ?? []) as AdminCommissionQueryRow[]);
}

async function listCommissionsWithoutPromoterLinks(
  supabase: SupabaseClient
): Promise<CommerceCommission[]> {
  const { data, error } = await supabase
    .from("commissions")
    .select("id,order_id,base_cents,rate_bps,amount_cents,status,hold_until,orders(referral_code)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load commissions: ${error.message}`);
  }

  return data.map((commission) => ({
    id: commission.id,
    orderId: commission.order_id,
    referralCode: getRelationObject<{ referral_code: string | null }>(
      commission.orders
    )?.referral_code ?? "",
    linkToken: undefined,
    baseCents: commission.base_cents,
    rateBps: commission.rate_bps,
    amountCents: commission.amount_cents,
    status: commission.status,
    holdUntil: commission.hold_until
  })) as CommerceCommission[];
}

function buildAdminCommissionSettlements(
  rows: AdminCommissionQueryRow[]
): AdminCommissionSettlement[] {
  const groups = new Map<
    string,
    Omit<
      AdminCommissionSettlement,
      | "commissionCount"
      | "orders"
      | "salesBaseCents"
      | "totalCommissionCents"
      | "unpaidCommissionCents"
      | "paidCommissionCents"
      | "cancelledCommissionCents"
    >
  >();

  for (const row of rows) {
    const order = getRelationObject<{
      order_number?: string | null;
      referral_code?: string | null;
      order_items?: Array<{ product_name?: string | null }> | null;
    }>(row.orders);
    const affiliate = getRelationObject<AffiliateRow>(row.affiliates);
    const link = getRelationObject<{ link_token?: string | null }>(row.affiliate_links);
    const item = asArray(order?.order_items)[0];
    const fallbackCode = order?.referral_code ?? "unknown";
    const affiliateId = affiliate?.id ?? row.affiliate_id ?? `missing:${fallbackCode}`;
    const existing = groups.get(affiliateId);
    const detail: AdminCommissionDetail = {
      id: row.id,
      orderId: row.order_id,
      orderNumber: order?.order_number ?? row.order_id,
      referralCode: affiliate?.code ?? fallbackCode,
      linkToken: link?.link_token ?? undefined,
      productName: item?.product_name ?? "Promoted order",
      baseCents: row.base_cents,
      rateBps: row.rate_bps,
      amountCents: row.amount_cents,
      status: row.status,
      holdUntil: row.hold_until,
      createdAt: row.created_at
    };

    if (existing) {
      existing.commissions.push(detail);
      continue;
    }

    groups.set(affiliateId, {
      affiliateId,
      profileId: affiliate?.profile_id ?? null,
      code: affiliate?.code ?? fallbackCode,
      displayName: affiliate?.display_name ?? fallbackCode,
      email: getRelationObject<{ email: string | null }>(affiliate?.profiles)?.email ?? null,
      status: affiliate?.status ?? "unknown",
      createdAt: affiliate?.created_at ?? null,
      termsAcceptedAt: affiliate?.terms_accepted_at ?? null,
      commissions: [detail]
    });
  }

  return Array.from(groups.values())
    .map((group) => {
      const activeCommissions = group.commissions.filter(
        (commission) => commission.status !== "cancelled"
      );
      const unpaidCommissions = group.commissions.filter(isUnpaidCommission);

      return {
        ...group,
        commissionCount: group.commissions.length,
        orders: new Set(group.commissions.map((commission) => commission.orderId)).size,
        salesBaseCents: sum(activeCommissions.map((commission) => commission.baseCents)),
        totalCommissionCents: sum(activeCommissions.map((commission) => commission.amountCents)),
        unpaidCommissionCents: sum(unpaidCommissions.map((commission) => commission.amountCents)),
        paidCommissionCents: sumStatusDetails(group.commissions, "paid"),
        cancelledCommissionCents: sumStatusDetails(group.commissions, "cancelled")
      };
    })
    .sort(sortAdminCommissionSettlements);
}

export async function getPromoterDashboard({
  userId,
  range = "30d"
}: {
  userId: string;
  range?: PromoterDateRange;
}): Promise<PromoterDashboard> {
  const supabase = createSupabasePrivilegedClient();
  try {
    const affiliate = await findAffiliateByProfileId(supabase, userId);

    if (!affiliate) {
      return emptyPromoterDashboard(range);
    }

    const products = await listActiveProductsForLinks(supabase);
    const links = affiliate.status === "active"
      ? await ensurePromoterLinks(supabase, affiliate, products)
      : await listAffiliateLinks(supabase, affiliate.id, affiliate.code);
    const since = getRangeStart(range);
    const [events, commissions] = await Promise.all([
      listReferralEventsForAffiliate(supabase, affiliate.id, since),
      listCommissionRowsForAffiliate(supabase, affiliate.id, since)
    ]);

    return buildPromoterDashboard({
      affiliate,
      range,
      links,
      events,
      commissions
    });
  } catch (error) {
    if (isPromoterSchemaMissingError(error)) {
      return emptyPromoterDashboard(range, false);
    }
    throw error;
  }
}

export async function applyForPromoter({
  userId,
  email,
  fullName,
  termsAcceptedAt = new Date().toISOString()
}: {
  userId: string;
  email: string;
  fullName?: string | null;
  termsAcceptedAt?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  try {
    const existing = await findAffiliateByProfileId(supabase, userId);

    if (existing) {
      return existing;
    }

    const displayName = fullName?.trim() || email.split("@")[0] || "shipK promoter";
    const codeBase = slugify(displayName).replace(/-/g, "_") || "shipk_promoter";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `${codeBase.slice(0, 40)}_${createSecureRandomToken(6)}`;
      const { data, error } = await supabase
        .from("affiliates")
        .insert({
          profile_id: userId,
          code,
          display_name: displayName,
          status: "active",
          terms_accepted_at: termsAcceptedAt
        })
        .select("id,profile_id,code,display_name,status,terms_accepted_at,created_at")
        .single();

      if (!error && data) {
        return mapAffiliateRow(data);
      }

      if (!isUniqueViolation(error)) {
        throw new Error(`Could not create promoter profile: ${error?.message ?? "unknown error"}`);
      }

      const afterConflict = await findAffiliateByProfileId(supabase, userId);
      if (afterConflict) {
        return afterConflict;
      }
    }

    throw new Error("Could not create a unique promoter code");
  } catch (error) {
    if (isPromoterSchemaMissingError(error)) {
      throw new Error(PROMOTER_SCHEMA_SETUP_MESSAGE);
    }
    throw error;
  }
}

export async function recordReferralClick({
  referralCode,
  linkToken,
  landingPath,
  anonymousId
}: {
  referralCode: string;
  linkToken: string;
  landingPath: string;
  anonymousId?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  try {
    const referral = await findActiveReferral(
      supabase,
      referralCode,
      linkToken,
      landingPath
    );

    if (!referral) {
      return { recorded: false };
    }

    await insertRequired(supabase, "referral_events", {
      affiliate_id: referral.id,
      affiliate_link_id: referral.linkId ?? null,
      referral_code: referral.code,
      link_token: referral.linkToken ?? null,
      anonymous_id: anonymousId ?? null,
      landing_path: landingPath,
      expires_at: createReferralExpiry(),
      metadata: {}
    });

    return { recorded: true };
  } catch (error) {
    if (isPromoterSchemaMissingError(error)) {
      return { recorded: false };
    }
    throw error;
  }
}

export async function listAdminAffiliates(): Promise<AdminAffiliateSummary[]> {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("affiliates")
    .select("id,profile_id,code,display_name,status,terms_accepted_at,created_at,profiles(email)")
    .order("created_at", { ascending: false });

  if (error) {
    if (isPromoterSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load affiliates: ${error.message}`);
  }

  const affiliates = (data ?? []).map((row) => ({
    ...mapAffiliateRow(row),
    email: getRelationObject<{ email: string | null }>(row.profiles)?.email ?? null
  }));
  const [events, commissions] = await Promise.all([
    listReferralEventsForAffiliateIds(supabase, affiliates.map((item) => item.id)),
    listCommissionRowsForAffiliateIds(supabase, affiliates.map((item) => item.id))
  ]);

  return affiliates.map((affiliate) => {
    const affiliateEvents = events.filter((event) => event.affiliate_id === affiliate.id);
    const affiliateCommissions = commissions.filter(
      (commission) => commission.affiliate_id === affiliate.id
    );

    return {
      ...affiliate,
      totalClicks: affiliateEvents.length,
      uniqueClicks: countUniqueClicks(affiliateEvents),
      orders: new Set(affiliateCommissions.map((commission) => commission.order_id)).size,
      commissionCents: sum(affiliateCommissions.map((commission) => commission.amount_cents))
    };
  });
}

export async function updateAffiliateStatus({
  affiliateId,
  status
}: {
  affiliateId: string;
  status: AffiliateStatus;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { error } = await supabase
    .from("affiliates")
    .update({ status })
    .eq("id", affiliateId);

  if (error) {
    throw new Error(`Could not update affiliate: ${error.message}`);
  }

  if (status === "blocked") {
    await cancelUnpaidCommissionsForAffiliate(supabase, affiliateId);
  }
}

export async function updateCommissionStatus({
  commissionId,
  status,
  now = new Date().toISOString()
}: {
  commissionId: string;
  status: CommerceCommission["status"];
  now?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { data: current, error: loadError } = await supabase
    .from("commissions")
    .select("id,status")
    .eq("id", commissionId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Could not load commission: ${loadError.message}`);
  }
  if (!current) {
    throw new CommissionStatusUpdateError("Commission not found", 404);
  }

  const currentStatus = (current as { status: CommerceCommission["status"] }).status;
  const transitionError = getCommissionStatusTransitionError({
    currentStatus,
    targetStatus: status
  });

  if (transitionError) {
    throw new CommissionStatusUpdateError(transitionError);
  }
  if (currentStatus === status) {
    return;
  }

  const values = getCommissionStatusUpdateValues(status, now);

  const { error } = await supabase
    .from("commissions")
    .update(values)
    .eq("id", commissionId);

  if (error) {
    throw new Error(`Could not update commission: ${error.message}`);
  }
}

export async function payUnpaidAffiliateCommissions({
  affiliateId,
  now = new Date().toISOString()
}: {
  affiliateId: string;
  now?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const { error } = await supabase
    .from("commissions")
    .update(getCommissionStatusUpdateValues("paid", now))
    .eq("affiliate_id", affiliateId)
    .in("status", ["pending", "approved"]);

  if (error) {
    throw new Error(`Could not pay affiliate commissions: ${error.message}`);
  }
}

export function getCommissionStatusUpdateValues(
  status: CommerceCommission["status"],
  now = new Date().toISOString()
) {
  return {
    status,
    approved_at: status === "approved" || status === "paid" ? now : null,
    paid_at: status === "paid" ? now : null
  };
}

export function getCommissionStatusActions({
  currentStatus
}: {
  currentStatus: CommerceCommission["status"];
}): CommissionStatusAction[] {
  return (["paid", "cancelled"] as const).map((status) => ({
    status,
    label: getCommissionStatusActionLabel(status),
    disabledReason:
      status === currentStatus
        ? "현재 상태입니다."
        : getCommissionStatusTransitionError({ currentStatus, targetStatus: status }) ?? undefined,
    requiresConfirmation: true
  }));
}

function getCommissionStatusTransitionError({
  currentStatus,
  targetStatus
}: {
  currentStatus: CommerceCommission["status"];
  targetStatus: CommerceCommission["status"];
}) {
  if (currentStatus === targetStatus) {
    return null;
  }
  if (currentStatus === "paid") {
    return "지급 완료된 커미션은 상태를 변경할 수 없습니다.";
  }
  if (currentStatus === "cancelled") {
    return "제외된 커미션은 상태를 변경할 수 없습니다.";
  }
  if (targetStatus === "paid" && isUnpaidStatus(currentStatus)) {
    return null;
  }
  if (targetStatus === "cancelled" && isUnpaidStatus(currentStatus)) {
    return null;
  }
  return "관리자 정산에서는 미정산 커미션을 지급 완료 또는 정산 제외만 처리할 수 있습니다.";
}

function getCommissionStatusActionLabel(status: "paid" | "cancelled") {
  const labels = {
    paid: "지급 완료",
    cancelled: "정산 제외"
  };
  return labels[status];
}

async function cancelUnpaidCommissionsForOrder(supabase: SupabaseClient, orderId: string) {
  const { error } = await supabase
    .from("commissions")
    .update(getCommissionStatusUpdateValues("cancelled"))
    .eq("order_id", orderId)
    .in("status", ["pending", "approved"]);

  if (error) {
    throw new Error(`Could not cancel order commissions: ${error.message}`);
  }
}

async function cancelUnpaidCommissionsForAffiliate(
  supabase: SupabaseClient,
  affiliateId: string
) {
  const { error } = await supabase
    .from("commissions")
    .update(getCommissionStatusUpdateValues("cancelled"))
    .eq("affiliate_id", affiliateId)
    .in("status", ["pending", "approved"]);

  if (error) {
    throw new Error(`Could not cancel affiliate commissions: ${error.message}`);
  }
}

export async function updateOrderFulfillment({
  orderId,
  status,
  carrier,
  trackingNumber
}: {
  orderId: string;
  status: OrderStatus;
  carrier?: string;
  trackingNumber?: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const trimmedCarrier = carrier?.trim();
  const trimmedTracking = trackingNumber?.trim();
  const nextStatus = shouldAutoMarkShipped({
    status,
    carrier: trimmedCarrier,
    trackingNumber: trimmedTracking
  })
    ? "shipped"
    : status;
  const existingOrder = await getOrderById(orderId, supabase);

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  if (
    existingOrder.status !== nextStatus &&
    !canTransitionOrderStatus(existingOrder.status, nextStatus)
  ) {
    throw new Error(`Cannot transition order from ${existingOrder.status} to ${nextStatus}`);
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId);

  if (orderError) {
    throw new Error(`Could not update order: ${orderError.message}`);
  }

  if (nextStatus === "cancelled" || nextStatus === "refunded") {
    await cancelUnpaidCommissionsForOrder(supabase, orderId);
  }

  if (carrier !== undefined || trackingNumber !== undefined) {
    const shippedAt =
      nextStatus === "shipped" && trimmedTracking ? new Date().toISOString() : null;
    const { error: shipmentError } = await supabase.from("shipments").upsert(
      {
        order_id: orderId,
        carrier: trimmedCarrier || null,
        tracking_number: trimmedTracking || null,
        shipped_at: shippedAt
      },
      { onConflict: "order_id" }
    );

    if (shipmentError) {
      throw new Error(`Could not update shipment: ${shipmentError.message}`);
    }
  }

  const order = await getOrderById(orderId, supabase);
  if (!order) {
    throw new Error("Order not found");
  }
  return order;
}

function emptyPromoterDashboard(
  range: PromoterDateRange,
  schemaReady = true
): PromoterDashboard {
  return {
    affiliate: null,
    range,
    schemaReady,
    summary: {
      totalClicks: 0,
      uniqueClicks: 0,
      orders: 0,
      salesCents: 0,
      pendingCommissionCents: 0,
      approvedCommissionCents: 0,
      paidCommissionCents: 0
    },
    links: [],
    commissions: []
  };
}

function buildPromoterDashboard({
  affiliate,
  range,
  links,
  events,
  commissions
}: {
  affiliate: PromoterAffiliate;
  range: PromoterDateRange;
  links: PromoterLinkSummary[];
  events: ReferralEventRow[];
  commissions: CommissionDashboardRow[];
}): PromoterDashboard {
  const totalClicks = events.length;
  const uniqueClicks = countUniqueClicks(events);
  const orders = new Set(commissions.map((commission) => commission.order_id)).size;

  return {
    affiliate,
    range,
    schemaReady: true,
    summary: {
      totalClicks,
      uniqueClicks,
      orders,
      salesCents: sum(commissions.map((commission) => commission.base_cents)),
      pendingCommissionCents: sumStatus(commissions, "pending"),
      approvedCommissionCents: sumStatus(commissions, "approved"),
      paidCommissionCents: sumStatus(commissions, "paid")
    },
    links: links.map((link) => {
      const linkEvents = events.filter((event) => event.affiliate_link_id === link.id);
      const linkCommissions = commissions.filter(
        (commission) => commission.affiliate_link_id === link.id
      );

      return {
        ...link,
        totalClicks: linkEvents.length,
        uniqueClicks: countUniqueClicks(linkEvents),
        orders: new Set(linkCommissions.map((commission) => commission.order_id)).size,
        salesCents: sum(linkCommissions.map((commission) => commission.base_cents)),
        commissionCents: sum(linkCommissions.map((commission) => commission.amount_cents))
      };
    }),
    commissions: commissions.map((commission) => ({
      id: commission.id,
      orderNumber: commission.order_number ?? commission.order_id,
      productName: commission.product_name ?? "Promoted order",
      linkToken: commission.link_token ?? undefined,
      baseCents: commission.base_cents,
      amountCents: commission.amount_cents,
      status: commission.status,
      holdUntil: commission.hold_until
    }))
  };
}

export function mapProductRow(row: ProductRow): Product {
  const options = sortByName(asArray(row.product_options));
  const option = options[0] ?? {
    id: `${row.id}_option`,
    name: "Default option",
    sku: row.slug.toUpperCase(),
    price_cents: 0,
    stock_quantity: 0
  };
  const normalizedSlug = normalizeLegacyProductSlug(row.slug);
  const category = inferProductCategory(row, normalizedSlug);
  const heroImagePath =
    normalizeLaunchCatalogAssetPath(row.hero_image_path) ||
    "/catalog-assets/admin-product-placeholder.svg";
  const productName = normalizeLaunchProductName(row.name, row.slug);
  const shortDescription = normalizeLaunchSurfaceCopy(row.short_description) ?? row.short_description;
  const description = normalizeLaunchSurfaceCopy(row.description) ?? row.description;
  const bestFor = normalizeLaunchSurfaceCopy(row.best_for);

  return {
    id: row.id,
    slug: normalizedSlug,
    productType: normalizeProductType(row.product_type),
    brandName: row.brand_name,
    name: productName,
    category,
    difficulty: row.difficulty ?? undefined,
    itemCount: row.item_count ?? undefined,
    shortDescription,
    description,
    bestFor: bestFor ?? undefined,
    result: normalizeLaunchSurfaceCopy(row.result) ?? undefined,
    disclosureNotes: normalizeProductDisclosureNotes(row.disclosure_notes),
    heroImagePath,
    introVideoUrl: row.intro_video_url ?? undefined,
    badges: [],
    tags: normalizeProductTags(row.tags, row, category, normalizedSlug),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    option: {
      id: option.id,
      name: option.name,
      sku: option.sku,
      priceCents: option.price_cents,
      stockQuantity: option.stock_quantity
    },
    galleryImages: sortBySortOrder(asArray(row.product_images)).map((image) => ({
      id: image.id,
      imagePath: normalizeLaunchCatalogAssetPath(image.image_path) ?? image.image_path,
      altText: normalizeLaunchSurfaceCopy(image.alt_text) ?? productName
    })),
    includedItems: sortBySortOrder(asArray(row.product_included_items)).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: normalizeLaunchSurfaceCopy(item.description) ?? item.description
    })),
    routineSteps: sortBySortOrder(asArray(row.product_routine_steps)).map((step) => ({
      id: step.id,
      title: step.title,
      body: step.body
    })),
    contentBlocks: sortBySortOrder(asArray(row.product_content_blocks)).map((block) => {
      if (block.type === "image") {
        return {
          id: block.id,
          type: "image" as const,
          imagePath: normalizeLaunchCatalogAssetPath(block.image_path) ?? heroImagePath,
          alt: normalizeLaunchSurfaceCopy(block.image_alt) ?? productName
        };
      }

      if (block.type === "image_text") {
        return {
          id: block.id,
          type: "image_text" as const,
          imagePath: normalizeLaunchCatalogAssetPath(block.image_path) ?? heroImagePath,
          alt: normalizeLaunchSurfaceCopy(block.image_alt) ?? productName,
          eyebrow: normalizeLaunchSurfaceCopy(block.eyebrow) ?? undefined,
          title: normalizeLaunchSurfaceCopy(block.title) ?? productName,
          body: normalizeLaunchSurfaceCopy(block.body) ?? description,
          imagePosition: block.image_position ?? "left"
        };
      }

      return {
        id: block.id,
        type: "text" as const,
        eyebrow: normalizeLaunchSurfaceCopy(block.eyebrow) ?? undefined,
        title: normalizeLaunchSurfaceCopy(block.title) ?? productName,
        body: normalizeLaunchSurfaceCopy(block.body) ?? description
      };
    }),
    detailSections: sortBySortOrder(asArray(row.product_detail_sections))
      .map(mapProductDetailSectionRow)
      .map(normalizeProductDetailSection)
  };
}

export async function hydrateProductsWithDetailSections(
  supabase: SupabaseClient,
  products: Product[]
) {
  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) {
    return products;
  }

  const { data, error } = await supabase
    .from("product_detail_sections")
    .select("id,product_id,sort_order,section_type,schema_version,content")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isProductDetailSectionsSchemaMissingError(error)) {
      return hydrateProductsWithDisclosureNotes(supabase, products);
    }

    throw new Error(`Could not load product detail sections: ${error.message}`);
  }

  const sectionsByProductId = new Map<string, Product["detailSections"]>();
  for (const row of (data ?? []) as ProductDetailSectionHydrationRow[]) {
    const sections = sectionsByProductId.get(row.product_id) ?? [];
    sections.push(normalizeProductDetailSection(mapProductDetailSectionRow(row)));
    sectionsByProductId.set(row.product_id, sections);
  }

  const productsWithDetailSections = products.map((product) => ({
    ...product,
    detailSections: sectionsByProductId.get(product.id) ?? product.detailSections
  }));

  return hydrateProductsWithDisclosureNotes(supabase, productsWithDetailSections);
}

function isProductDetailSectionsSchemaMissingError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST200" ||
    error.code === "PGRST205" ||
    (message.includes("product_detail_sections") &&
      (message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("Could not find")))
  );
}

async function hydrateProductsWithDisclosureNotes(
  supabase: SupabaseClient,
  products: Product[]
) {
  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) {
    return products;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,disclosure_notes")
    .in("id", productIds);

  if (error) {
    if (isProductDisclosureNotesSchemaMissingError(error)) {
      return products;
    }

    throw new Error(`Could not load product disclosure notes: ${error.message}`);
  }

  const disclosureNotesByProductId = new Map<string, Product["disclosureNotes"]>();
  for (const row of (data ?? []) as Array<{ id: string; disclosure_notes?: unknown }>) {
    disclosureNotesByProductId.set(row.id, normalizeProductDisclosureNotes(row.disclosure_notes));
  }

  return products.map((product) => ({
    ...product,
    disclosureNotes: disclosureNotesByProductId.get(product.id) ?? product.disclosureNotes
  }));
}

function isProductDisclosureNotesSchemaMissingError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes("disclosure_notes") &&
      (message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("Could not find")))
  );
}

const launchCatalogAssetPathOverrides: Record<string, string> = {
  "detail/bubble-tide-seafoam-splash-hydration-set-lifestyle.png":
    "/catalog-assets/detail/bubble-tide-lifestyle.png",
  "detail/cool-tone-drama-lifestyle.png": "/catalog-assets/detail/cool-tone-lifestyle.png",
  "detail/daily-k-glow-set-lifestyle.png": "/catalog-assets/detail/daily-k-glow-lifestyle.png",
  "detail/glass-skin-starter-lifestyle.png": "/catalog-assets/detail/glass-skin-lifestyle.png",
  "detail/k-pop-idol-look-lifestyle.png": "/catalog-assets/detail/k-pop-idol-lifestyle.png",
  "detail/warm-honey-look-lifestyle.png": "/catalog-assets/detail/warm-honey-lifestyle.png",
  "detail/y2k-cute-bomb-lifestyle.png": "/catalog-assets/detail/y2k-cute-lifestyle.png"
};

function normalizeLaunchCatalogAssetPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const demoAssetPath = value.replace(/^\/demo-assets\//, "/catalog-assets/");
  if (demoAssetPath !== value) {
    return demoAssetPath;
  }

  const storageObjectPath = getProductImagesStorageObjectPath(value);
  if (!storageObjectPath) {
    return value;
  }

  const overridePath = launchCatalogAssetPathOverrides[storageObjectPath];
  if (overridePath) {
    return overridePath;
  }

  if (storageObjectPath.startsWith("single-products/")) {
    return `/catalog-assets/singles/${storageObjectPath.replace("single-products/", "")}`;
  }

  if (storageObjectPath.startsWith("sets/")) {
    return `/catalog-assets/sets/${storageObjectPath.replace("sets/", "")}`;
  }

  if (storageObjectPath.startsWith("detail/")) {
    return `/catalog-assets/detail/${storageObjectPath.replace("detail/", "")}`;
  }

  return value;
}

function getProductImagesStorageObjectPath(value: string) {
  let pathname = value;

  try {
    pathname = new URL(value).pathname;
  } catch {
    // Non-URL catalog paths are handled by marker matching below.
  }

  const marker = "/product-images/";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex >= 0) {
    return safeDecodeURIComponent(pathname.slice(markerIndex + marker.length));
  }

  if (pathname.startsWith("product-images/")) {
    return safeDecodeURIComponent(pathname.slice("product-images/".length));
  }

  return null;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

const legacyProductSlugs: Record<string, string> = {
  "daily-k-glow-set": "skincare-starter-set",
  "k-pop-idol-look": "makeup-starter-set",
  "glass-skin-starter": "hydration-skincare-set",
  "y2k-cute-bomb": "gloss-makeup-set",
  "cool-tone-drama": "definition-makeup-set",
  "warm-honey-look": "warm-makeup-set"
};

const canonicalToLegacySlug = Object.fromEntries(
  Object.entries(legacyProductSlugs).map(([legacy, canonical]) => [canonical, legacy])
) as Record<string, string>;

const legacyProductNames: Record<string, string> = {
  "daily-k-glow-set": "Skincare Starter Set",
  "k-pop-idol-look": "Makeup Starter Set",
  "glass-skin-starter": "Hydration Skincare Set",
  "y2k-cute-bomb": "Gloss Makeup Set",
  "cool-tone-drama": "Definition Makeup Set",
  "warm-honey-look": "Warm Makeup Set"
};

const legacyProductDisplayNames: Record<string, string> = {
  "Daily K-Glow Set": "Skincare Starter Set",
  "K-Pop Idol Look": "Makeup Starter Set",
  "Glass Skin Starter": "Hydration Skincare Set",
  "Y2K Cute Bomb": "Gloss Makeup Set",
  "Cool Tone Drama": "Definition Makeup Set",
  "Warm Honey Look": "Warm Makeup Set"
};

const legacyProductCategories: Record<string, ProductCategory> = {
  "daily-k-glow-set": "Skincare",
  "skincare-starter-set": "Skincare",
  "glass-skin-starter": "Skincare",
  "hydration-skincare-set": "Skincare",
  "k-pop-idol-look": "Makeup",
  "makeup-starter-set": "Makeup",
  "y2k-cute-bomb": "Makeup",
  "gloss-makeup-set": "Makeup",
  "cool-tone-drama": "Makeup",
  "definition-makeup-set": "Makeup",
  "warm-honey-look": "Makeup",
  "warm-makeup-set": "Makeup"
};

function normalizeLaunchSurfaceCopy(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  let normalized = value;
  for (const [legacyName, productName] of Object.entries(legacyProductDisplayNames)) {
    normalized = normalized.replaceAll(legacyName, productName);
  }

  return normalized
    .replace(/\bFollow the routine in order\b/gi, "Follow the use order")
    .replace(/\bdaily routines\b/gi, "daily use")
    .replace(/\broutines\b/gi, "product steps")
    .replace(/\broutine\b/gi, "set")
    .replace(/\bCreator demos\b/g, "Creator tutorials")
    .replace(/\bcreator demonstrations\b/g, "creator tutorials")
    .replace(/\bCreator Code Demo\b/g, "Creator Code")
    .replace(/\bMVP\b/g, "Phase 1 launch")
    .replace(/\bfictional\s+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeProductSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function normalizeLegacyProductSlug(slug: string) {
  const normalizedSlug = normalizeProductSlug(slug);
  return legacyProductSlugs[normalizedSlug] ?? normalizedSlug;
}

function normalizeLaunchProductName(name: string, slug: string) {
  return legacyProductNames[slug] ?? name;
}

function normalizeProductDetailSection(
  section: Product["detailSections"][number]
): Product["detailSections"][number] {
  return normalizeProductDetailSectionValue(section) as Product["detailSections"][number];
}

function normalizeProductDetailSectionValue(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeLaunchSurfaceCopy(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeProductDetailSectionValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeProductDetailSectionValue(item)])
    );
  }

  return value;
}

const knownProductTags: Record<string, string[]> = {
  "skincare-starter-set": ["STARTER", "SKINCARE", "5 ITEMS"],
  "hydration-skincare-set": ["HYDRATION", "SKINCARE", "6 ITEMS"],
  "makeup-starter-set": ["MAKEUP", "STARTER", "7 ITEMS"],
  "gloss-makeup-set": ["GLOSS", "MAKEUP", "6 ITEMS"],
  "definition-makeup-set": ["DEFINITION", "MAKEUP", "7 ITEMS"],
  "warm-makeup-set": ["WARM", "MAKEUP", "6 ITEMS"],
  "bubble-tide-seafoam-splash-hydration-set": ["SEAFOAM", "HYDRATION", "SET"],
  "birch-water-toner-pads": ["TONER PAD", "HYDRATION", "QUICK PREP"],
  "seoul-cica-calm-ampoule": ["CICA", "AMPOULE", "CALM"],
  "rice-ceramide-barrier-cream": ["RICE", "CREAM", "COMFORT"],
  "peach-cloud-cream-blush": ["BLUSH", "PEACH", "CREAM"],
  "soft-mauve-shadow-quad": ["EYE", "MAUVE", "QUAD"],
  "cherry-jelly-lip-tint": ["LIP TINT", "CHERRY", "GLOSS"],
  "shipk-curated": ["SKINCARE", "SET"]
};

function normalizeMarketingBadges(badges: string[] | null | undefined) {
  const normalized = normalizeLabelList(badges)
    .map((badge) => {
      if (["BEST", "BEST SELLER", "BESTSELLER"].includes(badge)) {
        return "BESTSELLER";
      }
      if (["NEW", "NEWARRIVAL", "NEW ARRIVAL"].includes(badge)) {
        return "NEW ARRIVAL";
      }
      if (["LIMITED", "LIMITED DROP"].includes(badge)) {
        return "LIMITED";
      }
      if (["EDITOR PICK", "EDITOR'S PICK", "RECOMMENDED"].includes(badge)) {
        return "EDITOR'S PICK";
      }
      return "";
    })
    .filter(Boolean);

  return uniqueLabels(normalized).slice(0, 3);
}

function normalizeProductTagList(tags: string[] | null | undefined) {
  return uniqueLabels(normalizeLabelList(tags)).slice(0, 6);
}

function normalizeProductTags(
  tags: string[] | null | undefined,
  row: ProductRow,
  category: ProductCategory,
  normalizedSlug: string
) {
  const explicitTags = normalizeProductTagList(tags);
  if (explicitTags.length > 0) {
    return explicitTags;
  }

  const knownTags = knownProductTags[normalizedSlug] ?? knownProductTags[row.slug];
  if (knownTags) {
    return knownTags;
  }

  const migratedTags = normalizeProductTagList(
    row.badges?.filter((badge) => normalizeMarketingBadges([badge]).length === 0)
  );
  if (migratedTags.length > 0) {
    return migratedTags;
  }

  const productType = normalizeProductType(row.product_type);
  return inferProductTags(category, productType, row.item_count ?? undefined);
}

function inferInputProductTags(input: MutableProductInput, itemCount: number) {
  return inferProductTags(input.category, input.productType, itemCount);
}

function inferProductTags(
  category: ProductCategory,
  productType: ProductType,
  itemCount?: number
) {
  return [
    category.toUpperCase(),
    productType === "set" ? "SET" : "SINGLE",
    itemCount ? `${itemCount} ITEMS` : undefined
  ].filter((tag): tag is string => Boolean(tag));
}

function normalizeLabelList(values: string[] | null | undefined) {
  return (values ?? [])
    .map((value) => value.trim().replace(/\s+/g, " ").toUpperCase())
    .filter(Boolean);
}

function uniqueLabels(values: string[]) {
  return [...new Set(values)];
}

export function mapOrderRow(row: OrderRow): CommerceOrder {
  const item = asArray(row.order_items)[0];
  const shippingAddress = asArray(row.shipping_addresses)[0];
  const shipment = asArray(row.shipments)[0];
  const transaction = asArray(row.payment_transactions)[0];
  const productRelation = item ? getRelationObject<{ slug: string }>(item.products) : null;

  return {
    id: row.id,
    userId: row.user_id ?? "",
    orderItemId: item?.id ?? undefined,
    productId: item?.product_id ?? undefined,
    orderNumber: row.order_number,
    productSlug: productRelation?.slug ?? "",
    productName: item?.product_name ?? "Order item",
    optionName: item?.option_name ?? "Default option",
    quantity: item?.quantity ?? 1,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    currency: row.currency,
    status: row.status,
    paymentProvider: "paypal",
    paymentProviderOrderId: transaction?.provider_order_id ?? "",
    referralCode: row.referral_code ?? undefined,
    shippingAddress: {
      name: shippingAddress?.name ?? "",
      email: shippingAddress?.email ?? "",
      phone: shippingAddress?.phone ?? "",
      address1: shippingAddress?.address1 ?? "",
      address2: shippingAddress?.address2 ?? undefined,
      city: shippingAddress?.city ?? "",
      state: shippingAddress?.state ?? "",
      postalCode: shippingAddress?.postal_code ?? "",
      country: shippingAddress?.country ?? "US",
      memo: shippingAddress?.memo ?? undefined
    },
    shipmentCarrier: shipment?.carrier ?? undefined,
    trackingNumber: shipment?.tracking_number ?? undefined,
    createdAt: row.created_at
  };
}

function mapCheckoutSessionRow(row: CheckoutSessionRow): CheckoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    productSlug: row.product_slug,
    quantity: row.quantity,
    totalCents: row.total_cents,
    currency: row.currency,
    nonce: row.nonce,
    providerOrderId: row.provider_order_id ?? undefined,
    status: row.status,
    expiresAt: row.expires_at
  };
}

function normalizeNullableString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

async function getOrderById(orderId: string, supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await client
    .from("orders")
    .select(orderSelect)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load order: ${error.message}`);
  }

  return data ? mapOrderRow(data as OrderRow) : undefined;
}

async function getOrderByPaymentReference(
  supabase: SupabaseClient,
  {
    providerOrderId,
    providerCaptureId
  }: {
    providerOrderId: string;
    providerCaptureId?: string;
  }
) {
  const captureOrderId = providerCaptureId
    ? await findPaymentOrderId(supabase, "provider_capture_id", providerCaptureId)
    : null;
  const orderId =
    captureOrderId ?? (await findPaymentOrderId(supabase, "provider_order_id", providerOrderId));

  return orderId ? getOrderById(orderId, supabase) : undefined;
}

async function findPaymentOrderId(
  supabase: SupabaseClient,
  column: "provider_order_id" | "provider_capture_id",
  value: string
) {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("order_id")
    .eq("provider", "paypal")
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load payment transaction: ${error.message}`);
  }

  return (data?.order_id as string | undefined) ?? null;
}

export async function getProductById(productId: string, supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await client
    .from("products")
    .select(productSelect)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load product: ${error.message}`);
  }

  if (!data) {
    return undefined;
  }

  const [product] = await hydrateProductsWithDetailSections(client, [mapProductRow(data as ProductRow)]);
  const [decoratedProduct] = await decorateProductsWithAutomaticMerchandising([product]);
  return decoratedProduct;
}

async function upsertPrimaryOption(
  supabase: SupabaseClient,
  productId: string,
  input: MutableProductInput,
  itemCount: number,
  slug: string
) {
  const { data: options, error: optionsError } = await supabase
    .from("product_options")
    .select("id")
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (optionsError) {
    throw optionsError;
  }

  const optionValues = {
    product_id: productId,
    name:
      input.optionName ||
      (input.productType === "set" ? `${itemCount}-item set` : "Default option"),
    sku: input.sku || slug.toUpperCase().replace(/-/g, "-").slice(0, 24),
    price_cents: input.priceCents,
    stock_quantity: input.stockQuantity
  };

  const optionId = options?.[0]?.id;
  if (optionId) {
    const { error } = await supabase.from("product_options").update(optionValues).eq("id", optionId);
    if (error) {
      throw error;
    }
    return;
  }

  await insertRequired(supabase, "product_options", optionValues);
}

async function replaceProductChildren(
  supabase: SupabaseClient,
  productId: string,
  input: MutableProductInput,
  heroImagePath: string
) {
  await deleteProductChildren(supabase, productId);

  if (input.galleryImages.length > 0) {
    await insertRequired(
      supabase,
      "product_images",
      input.galleryImages.map((image, index) => ({
        product_id: productId,
        sort_order: index + 1,
        image_path: image.imagePath,
        alt_text: image.altText
      }))
    );
  }

  if (input.includedItems.length > 0) {
    await insertRequired(
      supabase,
      "product_included_items",
      input.includedItems.map((item, index) => ({
        product_id: productId,
        sort_order: index + 1,
        name: item.name,
        category: item.category,
        description: item.description
      }))
    );
  }

  if (input.routineSteps.length > 0) {
    await insertRequired(
      supabase,
      "product_routine_steps",
      input.routineSteps.map((step, index) => ({
        product_id: productId,
        sort_order: index + 1,
        title: step.title,
        body: step.body
      }))
    );
  }

  const blocks = input.contentBlocks.length
    ? input.contentBlocks
    : [
        {
          type: "image" as const,
          imagePath: heroImagePath,
          alt: `${input.name} product image`
        },
        {
          type: "text" as const,
          eyebrow: input.productType === "set" ? "Set story" : "Product story",
          title: input.result || input.shortDescription,
          body: input.bestFor || input.description
        }
      ];

  if (blocks.length > 0) {
    await insertRequired(
      supabase,
      "product_content_blocks",
      blocks.map((block, index) => ({
        product_id: productId,
        sort_order: index + 1,
        type: block.type,
        eyebrow: "eyebrow" in block ? block.eyebrow ?? null : null,
        title: "title" in block ? block.title ?? null : null,
        body: "body" in block ? block.body ?? null : null,
        image_path: "imagePath" in block ? block.imagePath ?? null : null,
        image_alt: "alt" in block ? block.alt ?? null : null,
        image_position: "imagePosition" in block ? block.imagePosition ?? null : null
      }))
    );
  }
}

async function deleteProductChildren(supabase: SupabaseClient, productId: string) {
  for (const table of [
    "product_images",
    "product_included_items",
    "product_routine_steps",
    "product_content_blocks"
  ]) {
    const { error } = await supabase.from(table).delete().eq("product_id", productId);
    if (error) {
      throw error;
    }
  }
}

async function replaceProductDetailSectionsIfNeeded(
  supabase: SupabaseClient,
  productId: string,
  input: MutableProductInput
) {
  if (input.detailSections.length === 0) {
    return;
  }

  if (!input.detailActorId) {
    throw new Error("Admin detail section actor is required");
  }

  const { error } = await supabase.rpc("replace_product_detail_sections", {
    p_product_id: productId,
    p_actor_id: input.detailActorId,
    p_sections: toProductDetailSectionRpcPayload(input.detailSections)
  });

  if (error) {
    throw error;
  }
}

async function insertRequired(
  supabase: SupabaseClient,
  table: string,
  values: Record<string, unknown> | Array<Record<string, unknown>>
) {
  const { error } = await supabase.from(table).insert(values);
  if (error) {
    throw error;
  }
}

async function findOrCreateCategoryId(supabase: SupabaseClient, categoryName: string) {
  const slug = slugify(categoryName);
  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert({ name: categoryName, slug, sort_order: 100 })
    .select("id")
    .single();

  if (createError) {
    const { data: existingByName, error: existingByNameError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .maybeSingle();

    if (existingByNameError || !existingByName) {
      throw createError;
    }
    return existingByName.id as string;
  }

  return created.id as string;
}

async function findAffiliateByProfileId(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from("affiliates")
    .select("id,profile_id,code,display_name,status,terms_accepted_at,created_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAffiliateRow(data as AffiliateRow) : null;
}

async function findActiveReferral(
  supabase: SupabaseClient,
  referralCode: string,
  linkToken: string,
  landingPath: string
) {
  const { data: affiliate, error: affiliateError } = await supabase
    .from("affiliates")
    .select("id,profile_id,code,status,profiles(email,phone)")
    .eq("code", referralCode)
    .eq("status", "active")
    .maybeSingle();

  if (affiliateError) {
    throw affiliateError;
  }

  if (!affiliate) {
    return null;
  }

  const normalizedLandingPath = normalizeReferralLandingPath(landingPath);
  const { data: link, error: linkError } = await supabase
    .from("affiliate_links")
    .select("id,link_token,destination_path,status")
    .eq("affiliate_id", affiliate.id)
    .eq("link_token", linkToken)
    .eq("status", "active")
    .maybeSingle();

  if (linkError) {
    throw linkError;
  }

  if (
    !link ||
    !areEquivalentReferralLandingPaths(link.destination_path as string, normalizedLandingPath)
  ) {
    return null;
  }

  return {
    id: affiliate.id as string,
    profileId: affiliate.profile_id as string | null,
    code: affiliate.code as string,
    status: affiliate.status as AffiliateStatus,
    email: getRelationObject<{ email: string | null; phone?: string | null }>(
      (affiliate as AffiliateRow).profiles
    )?.email ?? null,
    phone: getRelationObject<{ email: string | null; phone?: string | null }>(
      (affiliate as AffiliateRow).profiles
    )?.phone ?? null,
    linkId: link.id as string,
    linkToken: link.link_token as string,
    linkStatus: link.status as AffiliateLinkStatus
  };
}

async function findActiveAffiliateProductLink(
  supabase: SupabaseClient,
  affiliateId: string,
  product: Product
) {
  const { data: link, error: linkError } = await supabase
    .from("affiliate_links")
    .select("id,link_token,destination_path,status")
    .eq("affiliate_id", affiliateId)
    .eq("product_id", product.id)
    .eq("status", "active")
    .maybeSingle();

  if (linkError) {
    throw linkError;
  }

  if (!link || !isProductReferralDestinationPath(link.destination_path as string, product)) {
    return null;
  }

  return {
    linkId: link.id as string,
    linkToken: link.link_token as string,
    linkStatus: link.status as AffiliateLinkStatus
  };
}

function getProductReferralDestinationPaths(product: Product) {
  const paths = new Set([normalizeReferralLandingPath(`/products/${product.slug}`)]);
  const legacySlug = canonicalToLegacySlug[product.slug];
  if (legacySlug) {
    paths.add(normalizeReferralLandingPath(`/products/${legacySlug}`));
  }
  return paths;
}

function isProductReferralDestinationPath(value: string, product: Product) {
  try {
    return getProductReferralDestinationPaths(product).has(normalizeReferralLandingPath(value));
  } catch {
    return false;
  }
}

function areEquivalentReferralLandingPaths(left: string, right: string) {
  try {
    return (
      normalizeCanonicalReferralLandingPath(left) ===
      normalizeCanonicalReferralLandingPath(right)
    );
  } catch {
    return false;
  }
}

function normalizeCanonicalReferralLandingPath(path: string) {
  const normalizedPath = normalizeReferralLandingPath(path);
  const slug = normalizedPath.replace("/products/", "");
  return `/products/${normalizeLegacyProductSlug(slug)}`;
}

async function findOrCreateActiveAffiliateProductLink(
  supabase: SupabaseClient,
  affiliateId: string,
  product: Product
) {
  const existing = await findActiveAffiliateProductLink(supabase, affiliateId, product);
  if (existing) {
    return existing;
  }

  await insertAffiliateLink(supabase, affiliateId, {
    id: product.id,
    slug: product.slug
  });

  return findActiveAffiliateProductLink(supabase, affiliateId, product);
}

function mapAffiliateRow(row: AffiliateRow): PromoterAffiliate {
  return {
    id: row.id,
    profileId: row.profile_id,
    code: row.code,
    displayName: row.display_name,
    status: row.status,
    termsAcceptedAt: row.terms_accepted_at,
    createdAt: row.created_at
  };
}

async function listActiveProductsForLinks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load promoter products: ${error.message}`);
  }

  return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
}

async function ensurePromoterLinks(
  supabase: SupabaseClient,
  affiliate: PromoterAffiliate,
  products: Array<{ id: string; name: string; slug: string }>
) {
  const existing = await listAffiliateLinks(supabase, affiliate.id, affiliate.code);
  const existingProductIds = new Set(existing.map((link) => link.productId));
  const missingProducts = products.filter((product) => !existingProductIds.has(product.id));

  for (const product of missingProducts) {
    await insertAffiliateLink(supabase, affiliate.id, product);
  }

  return listAffiliateLinks(supabase, affiliate.id, affiliate.code);
}

async function insertAffiliateLink(
  supabase: SupabaseClient,
  affiliateId: string,
  product: { id: string; slug: string }
) {
  let lastUniqueViolation: { message?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from("affiliate_links").insert({
      affiliate_id: affiliateId,
      product_id: product.id,
      link_token: createSecureRandomToken(12),
      destination_path: `/products/${product.slug}`,
      status: "active"
    });

    if (!error) {
      return;
    }
    if (!isUniqueViolation(error)) {
      throw new Error(`Could not create affiliate link: ${error.message}`);
    }
    lastUniqueViolation = error;
  }

  throw new Error(
    `Could not create affiliate link: ${
      lastUniqueViolation?.message ?? "unique token retry limit exceeded"
    }`
  );
}

async function listAffiliateLinks(
  supabase: SupabaseClient,
  affiliateId: string,
  referralCode: string
) {
  const { data, error } = await supabase
    .from("affiliate_links")
    .select("id,product_id,link_token,destination_path,status,products(name,slug)")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load affiliate links: ${error.message}`);
  }

  return ((data ?? []) as AffiliateLinkRow[]).map((link) => {
    const product = getRelationObject<{ name: string; slug: string }>(link.products);
    const productSlug = product?.slug ?? link.destination_path.replace("/products/", "");

    return {
      id: link.id,
      productId: link.product_id,
      productName: product?.name ?? "Product",
      productSlug,
      status: link.status,
      linkToken: link.link_token,
      referralPath: buildProductReferralPath({
        productSlug,
        referralCode,
        linkToken: link.link_token
      }),
      totalClicks: 0,
      uniqueClicks: 0,
      orders: 0,
      salesCents: 0,
      commissionCents: 0
    };
  });
}

async function listReferralEventsForAffiliate(
  supabase: SupabaseClient,
  affiliateId: string,
  since: string | null
) {
  const query = supabase
    .from("referral_events")
    .select("id,affiliate_id,affiliate_link_id,anonymous_id,clicked_at")
    .eq("affiliate_id", affiliateId)
    .order("clicked_at", { ascending: false });

  if (since) {
    query.gte("clicked_at", since);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load referral events: ${error.message}`);
  }
  return (data ?? []) as ReferralEventRow[];
}

async function listReferralEventsForAffiliateIds(
  supabase: SupabaseClient,
  affiliateIds: string[]
) {
  if (affiliateIds.length === 0) {
    return [] as ReferralEventRow[];
  }
  const { data, error } = await supabase
    .from("referral_events")
    .select("id,affiliate_id,affiliate_link_id,anonymous_id,clicked_at")
    .in("affiliate_id", affiliateIds);

  if (error) {
    throw new Error(`Could not load referral events: ${error.message}`);
  }
  return (data ?? []) as ReferralEventRow[];
}

async function listCommissionRowsForAffiliate(
  supabase: SupabaseClient,
  affiliateId: string,
  since: string | null
) {
  const query = supabase
    .from("commissions")
    .select(
      "id,affiliate_id,affiliate_link_id,order_id,base_cents,amount_cents,status,hold_until,orders(order_number,order_items(product_name)),affiliate_links(link_token)"
    )
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  if (since) {
    query.gte("created_at", since);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load promoter commissions: ${error.message}`);
  }
  return (data ?? []).map(mapCommissionDashboardRow);
}

async function listCommissionRowsForAffiliateIds(
  supabase: SupabaseClient,
  affiliateIds: string[]
) {
  if (affiliateIds.length === 0) {
    return [] as CommissionDashboardRow[];
  }
  const { data, error } = await supabase
    .from("commissions")
    .select("id,affiliate_id,affiliate_link_id,order_id,base_cents,amount_cents,status,hold_until")
    .in("affiliate_id", affiliateIds);

  if (error) {
    throw new Error(`Could not load affiliate commissions: ${error.message}`);
  }
  return (data ?? []) as CommissionDashboardRow[];
}

function mapCommissionDashboardRow(row: Record<string, unknown>): CommissionDashboardRow {
  const order = getRelationObject<{
    order_number?: string | null;
    order_items?: Array<{ product_name?: string | null }> | null;
  }>(row.orders as never);
  const link = getRelationObject<{ link_token?: string | null }>(
    row.affiliate_links as never
  );
  const item = asArray(order?.order_items)[0];

  return {
    id: row.id as string,
    affiliate_id: row.affiliate_id as string,
    affiliate_link_id: (row.affiliate_link_id as string | null) ?? null,
    order_id: row.order_id as string,
    base_cents: row.base_cents as number,
    amount_cents: row.amount_cents as number,
    status: row.status as CommerceCommission["status"],
    hold_until: row.hold_until as string,
    order_number: order?.order_number ?? null,
    product_name: item?.product_name ?? null,
    link_token: link?.link_token ?? null
  };
}

function getRangeStart(range: PromoterDateRange) {
  if (range === "all") {
    return null;
  }

  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (range === "7d" ? 7 : 30));
  return date.toISOString();
}

function countUniqueClicks(events: Pick<ReferralEventRow, "anonymous_id" | "id">[]) {
  const unique = new Set(
    events.map((event) => event.anonymous_id || event.id).filter(isString)
  );
  return unique.size;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function sumStatus(
  commissions: CommissionDashboardRow[],
  status: CommerceCommission["status"]
) {
  return sum(
    commissions
      .filter((commission) => commission.status === status)
      .map((commission) => commission.amount_cents)
  );
}

function sumStatusDetails(
  commissions: AdminCommissionDetail[],
  status: CommerceCommission["status"]
) {
  return sum(
    commissions
      .filter((commission) => commission.status === status)
      .map((commission) => commission.amountCents)
  );
}

function isUnpaidCommission(commission: AdminCommissionDetail) {
  return isUnpaidStatus(commission.status);
}

function isUnpaidStatus(status: CommerceCommission["status"]) {
  return status === "pending" || status === "approved";
}

function sortAdminCommissionSettlements(
  first: AdminCommissionSettlement,
  second: AdminCommissionSettlement
) {
  if (first.unpaidCommissionCents !== second.unpaidCommissionCents) {
    return second.unpaidCommissionCents - first.unpaidCommissionCents;
  }
  if (first.totalCommissionCents !== second.totalCommissionCents) {
    return second.totalCommissionCents - first.totalCommissionCents;
  }
  return first.displayName.localeCompare(second.displayName);
}

export function createSecureRandomToken(length: number) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Token length must be a positive integer");
  }

  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const maxAcceptedByte = 256 - (256 % alphabet.length);
  let token = "";

  while (token.length < length) {
    const bytes = new Uint8Array(length - token.length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= maxAcceptedByte) {
        continue;
      }
      token += alphabet[byte % alphabet.length];
      if (token.length === length) {
        break;
      }
    }
  }

  return token;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export function isPromoterSchemaMissingError(error: unknown) {
  const parts: string[] = [];
  collectErrorParts(error, parts);
  const text = parts.join(" ").toLowerCase();

  if (!text) {
    return false;
  }

  const referencesPromoterSchema = [
    "affiliate_links",
    "terms_accepted_at",
    "affiliate_link_id",
    "link_token",
    "referral_events.metadata",
    "column referral_events.metadata",
    "public.affiliate_links"
  ].some((token) => text.includes(token));

  const isMissingSchemaCode = ["42703", "42p01", "pgrst205"].some((code) =>
    text.includes(code)
  );
  const hasMissingSchemaLanguage = [
    "does not exist",
    "could not find",
    "schema cache",
    "undefined column",
    "could not load affiliate links",
    "could not load referral events",
    "could not load promoter commissions",
    "could not load affiliates"
  ].some((token) => text.includes(token));

  return referencesPromoterSchema && (isMissingSchemaCode || hasMissingSchemaLanguage);
}

function collectErrorParts(error: unknown, parts: string[]) {
  if (!error) {
    return;
  }

  if (error instanceof Error) {
    parts.push(error.message);
    collectErrorParts(error.cause, parts);
    return;
  }

  if (typeof error === "string") {
    parts.push(error);
    return;
  }

  if (typeof error !== "object") {
    return;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  for (const value of [
    candidate.code,
    candidate.message,
    candidate.details,
    candidate.hint
  ]) {
    if (typeof value === "string") {
      parts.push(value);
    }
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function createOrderNumber() {
  return `SK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0")}`;
}

function createReferralExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCHours(expiresAt.getUTCHours() + 48);
  return expiresAt.toISOString();
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getRelationObject<T>(value: T | T[] | null | undefined): T | null {
  return asArray(value)[0] ?? null;
}

function normalizeProductType(value: ProductType | "curated_set" | null): ProductType {
  if (value === "curated_set") {
    return "set";
  }

  return value ?? "single";
}

function normalizeProductCategory(value: string | null | undefined): ProductCategory {
  return value === "Makeup" ? "Makeup" : "Skincare";
}

function inferProductCategory(row: ProductRow, normalizedSlug: string): ProductCategory {
  const legacyCategory = legacyProductCategories[normalizedSlug] ?? legacyProductCategories[row.slug];
  if (legacyCategory) {
    return legacyCategory;
  }

  const relationCategory = normalizeProductCategory(
    getRelationObject<{ name: string }>(row.categories)?.name
  );
  const haystack = [
    row.slug,
    normalizedSlug,
    row.name,
    row.short_description,
    row.description,
	    row.best_for,
	    row.result,
	    ...(row.badges ?? []),
	    ...(row.tags ?? []),
	    ...asArray(row.product_included_items).flatMap((item) => [
      item.name,
      item.category,
      item.description
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const looksLikeSkincare =
    /\b(skincare|skin care|cleanser|foam|toner|pads|serum|ampoule|essence|cica|ceramide|barrier|birch|rice|sunscreen|spf|mask|moisturizer|moisturising|moisturizing|hydration|hydrate|hydro)\b/.test(
      haystack
    );
  const looksLikeMakeup =
    /\b(makeup|lip|lips|eye|eyes|shadow|liner|brow|lash|blush|cheek|cushion|gloss|tint|powder|primer|palette|idol|k-pop|kpop|y2k|definition)\b/.test(
      haystack
    ) ||
    haystack.includes("cool-tone") ||
    haystack.includes("warm-honey");

  if (looksLikeMakeup && !looksLikeSkincare) {
    return "Makeup";
  }
  if (looksLikeSkincare && !looksLikeMakeup) {
    return "Skincare";
  }

  return relationCategory;
}

function sortBySortOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function resetCommerceStoreForTests() {
  // The commerce store is now backed by Supabase; tests should mock at the data layer
  // instead of mutating a process-local singleton.
}
