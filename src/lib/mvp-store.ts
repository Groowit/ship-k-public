import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_COMMISSION_RATE_BPS,
  OrderStatus,
  calculateCommissionCents,
  calculateOrderTotals,
  shouldCreateReferralCommission
} from "./commerce";
import { shouldAutoMarkShipped } from "./fulfillment";
import {
  Product,
  ProductCollectionSlug,
  ProductDifficulty,
  ProductGalleryImage,
  ProductIncludedItem,
  ProductRoutineStep,
  ProductStatus,
  ProductType,
  getCollectionBySlug,
  productCollectionSlugs
} from "./products";
import { buildProductReferralPath, normalizeReferralLandingPath } from "./referral";
import { createSupabasePrivilegedClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

type MutableProductInput = {
  productType: ProductType;
  brandName: string;
  name: string;
  category: string;
  collectionSlug?: ProductCollectionSlug;
  difficulty?: ProductDifficulty;
  itemCount?: number;
  themeLabel?: string;
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
  country: "US";
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

export type MvpOrder = {
  id: string;
  userId: string;
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

export type MvpCommission = {
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
  status: MvpCommission["status"];
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

type ProductOptionRow = {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
  stock_quantity: number;
};

type ProductRow = {
  id: string;
  brand_name: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  hero_image_path: string | null;
  status: "active" | "draft" | "archived";
  badges: string[] | null;
  product_type: ProductType | null;
  collection_slug: string | null;
  collection_name: string | null;
  difficulty: ProductDifficulty | null;
  item_count: number | null;
  theme_label: string | null;
  intro_video_url: string | null;
  best_for: string | null;
  result: string | null;
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
    country: "US";
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
  status: MvpCommission["status"];
  hold_until: string;
  order_number?: string | null;
  product_name?: string | null;
  link_token?: string | null;
};

const PROMOTER_SCHEMA_SETUP_MESSAGE =
  "Promoter portal setup is pending. Apply the latest Supabase migration before using applications and product links.";

const productSelect = `
  id,
  brand_name,
  name,
  slug,
  short_description,
  description,
  hero_image_path,
  status,
  badges,
  product_type,
  collection_slug,
  collection_name,
  difficulty,
  item_count,
  theme_label,
  intro_video_url,
  best_for,
  result,
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
  order_items(product_name,option_name,quantity,product_id,products(slug)),
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

  return (data as ProductRow[]).map(mapProductRow);
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

  return (data as ProductRow[]).map(mapProductRow);
}

export async function findProductBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load product: ${error.message}`);
  }

  return data ? mapProductRow(data as ProductRow) : undefined;
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

  return data ? mapProductRow(data as ProductRow) : undefined;
}

export async function createProduct(input: MutableProductInput) {
  const supabase = createSupabasePrivilegedClient();
  const slug = slugify(`${input.brandName}-${input.name}`);
  const collection = input.collectionSlug
    ? getCollectionBySlug(input.collectionSlug)
    : undefined;
  const itemCount = input.itemCount ?? input.includedItems.length;
  const heroImagePath =
    input.heroImagePath ||
    (input.collectionSlug ? `/demo-assets/sets/${collectionFallbackImage(input.collectionSlug)}` : undefined) ||
    "/demo-assets/admin-product-placeholder.svg";
  let productId: string | null = null;

  try {
    const categoryId = await findOrCreateCategoryId(supabase, input.category);
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        category_id: categoryId,
        brand_name: input.brandName,
        name: input.name,
        slug,
        short_description: input.shortDescription,
        description: input.description,
        hero_image_path: heroImagePath,
        status: input.status,
        badges: ["New arrival", collection?.name ?? input.category],
        product_type: input.productType,
        collection_slug: input.collectionSlug ?? null,
        collection_name: collection?.name ?? null,
        difficulty: input.difficulty ?? null,
        item_count: itemCount,
        theme_label: input.themeLabel || collection?.themeLabel || null,
        intro_video_url: input.introVideoUrl || null,
        best_for: input.bestFor || null,
        result: input.result || null
      })
      .select("id")
      .single();

    if (productError) {
      throw productError;
    }

    productId = product.id as string;

    await insertRequired(supabase, "product_options", {
      product_id: productId,
      name:
        input.optionName ||
        (input.productType === "curated_set" ? `${itemCount}-item routine kit` : "Default option"),
      sku: input.sku || slug.toUpperCase().replace(/-/g, "-").slice(0, 24),
      price_cents: input.priceCents,
      stock_quantity: input.stockQuantity
    });

    await replaceProductChildren(supabase, productId, input, heroImagePath);

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
    throw new Error(error instanceof Error ? error.message : "Could not save product");
  }
}

export async function updateProduct(productId: string, input: MutableProductInput) {
  const supabase = createSupabasePrivilegedClient();
  const existing = await getProductById(productId, supabase);

  if (!existing) {
    throw new Error("Product not found");
  }

  const collection = input.collectionSlug
    ? getCollectionBySlug(input.collectionSlug)
    : undefined;
  const itemCount = input.itemCount ?? input.includedItems.length;
  const heroImagePath =
    input.heroImagePath ||
    (input.collectionSlug ? `/demo-assets/sets/${collectionFallbackImage(input.collectionSlug)}` : undefined) ||
    "/demo-assets/admin-product-placeholder.svg";

  try {
    const categoryId = await findOrCreateCategoryId(supabase, input.category);
    const { error: productError } = await supabase
      .from("products")
      .update({
        category_id: categoryId,
        brand_name: input.brandName,
        name: input.name,
        short_description: input.shortDescription,
        description: input.description,
        hero_image_path: heroImagePath,
        status: input.status,
        badges: ["New arrival", collection?.name ?? input.category],
        product_type: input.productType,
        collection_slug: input.collectionSlug ?? null,
        collection_name: collection?.name ?? null,
        difficulty: input.difficulty ?? null,
        item_count: itemCount || null,
        theme_label: input.themeLabel || collection?.themeLabel || null,
        intro_video_url: input.introVideoUrl || null,
        best_for: input.bestFor || null,
        result: input.result || null
      })
      .eq("id", productId);

    if (productError) {
      throw productError;
    }

    await upsertPrimaryOption(supabase, productId, input, itemCount, existing.slug);
    await replaceProductChildren(supabase, productId, input, heroImagePath);

    const updated = await getProductById(productId, supabase);
    if (!updated) {
      throw new Error("Product was updated but could not be reloaded");
    }
    return updated;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Could not update product");
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
          affiliate_link_id: referral.linkId ?? null,
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
    throw new Error(error instanceof Error ? error.message : "Could not save order");
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
  })) as MvpCommission[];
}

async function listCommissionsWithoutPromoterLinks(
  supabase: SupabaseClient
): Promise<MvpCommission[]> {
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
  })) as MvpCommission[];
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
      const code = `${codeBase.slice(0, 40)}_${createRandomToken(6)}`;
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
  status
}: {
  commissionId: string;
  status: MvpCommission["status"];
}) {
  const supabase = createSupabasePrivilegedClient();
  const values = getCommissionStatusUpdateValues(status);

  const { error } = await supabase
    .from("commissions")
    .update(values)
    .eq("id", commissionId);

  if (error) {
    throw new Error(`Could not update commission: ${error.message}`);
  }
}

export function getCommissionStatusUpdateValues(
  status: MvpCommission["status"],
  now = new Date().toISOString()
) {
  return {
    status,
    approved_at: status === "approved" || status === "paid" ? now : null,
    paid_at: status === "paid" ? now : null
  };
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
  const collectionSlug = getProductCollectionSlug(row.collection_slug);
  const collection = collectionSlug ? getCollectionBySlug(collectionSlug) : undefined;
  const options = sortByName(asArray(row.product_options));
  const option = options[0] ?? {
    id: `${row.id}_option`,
    name: "Default option",
    sku: row.slug.toUpperCase(),
    price_cents: 0,
    stock_quantity: 0
  };
  const category = getRelationObject<{ name: string }>(row.categories)?.name ?? "Routine Kit";
  const heroImagePath = row.hero_image_path || "/demo-assets/admin-product-placeholder.svg";

  return {
    id: row.id,
    slug: row.slug,
    productType: row.product_type ?? "single",
    brandName: row.brand_name,
    name: row.name,
    category,
    collectionSlug,
    collectionName: row.collection_name ?? collection?.name,
    difficulty: row.difficulty ?? undefined,
    itemCount: row.item_count ?? undefined,
    themeLabel: row.theme_label ?? collection?.themeLabel,
    shortDescription: row.short_description,
    description: row.description,
    bestFor: row.best_for ?? undefined,
    result: row.result ?? undefined,
    heroImagePath,
    introVideoUrl: row.intro_video_url ?? undefined,
    badges: row.badges?.length ? row.badges : [row.theme_label, row.collection_name].filter(isString),
    status: row.status,
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
      imagePath: image.image_path,
      altText: image.alt_text || row.name
    })),
    includedItems: sortBySortOrder(asArray(row.product_included_items)).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description
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
          imagePath: block.image_path ?? heroImagePath,
          alt: block.image_alt ?? row.name
        };
      }

      if (block.type === "image_text") {
        return {
          id: block.id,
          type: "image_text" as const,
          imagePath: block.image_path ?? heroImagePath,
          alt: block.image_alt ?? row.name,
          eyebrow: block.eyebrow ?? undefined,
          title: block.title ?? row.name,
          body: block.body ?? row.description,
          imagePosition: block.image_position ?? "left"
        };
      }

      return {
        id: block.id,
        type: "text" as const,
        eyebrow: block.eyebrow ?? undefined,
        title: block.title ?? row.name,
        body: block.body ?? row.description
      };
    })
  };
}

export function mapOrderRow(row: OrderRow): MvpOrder {
  const item = asArray(row.order_items)[0];
  const shippingAddress = asArray(row.shipping_addresses)[0];
  const shipment = asArray(row.shipments)[0];
  const transaction = asArray(row.payment_transactions)[0];
  const productRelation = item ? getRelationObject<{ slug: string }>(item.products) : null;

  return {
    id: row.id,
    userId: row.user_id ?? "",
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

async function getProductById(productId: string, supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await client
    .from("products")
    .select(productSelect)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load product: ${error.message}`);
  }

  return data ? mapProductRow(data as ProductRow) : undefined;
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
      (input.productType === "curated_set" ? `${itemCount}-item routine kit` : "Default option"),
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
          eyebrow: input.productType === "curated_set" ? "Curated routine" : "Product story",
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

  if (!link || link.destination_path !== normalizedLandingPath) {
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
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from("affiliate_links").insert({
      affiliate_id: affiliateId,
      product_id: product.id,
      link_token: createRandomToken(12),
      destination_path: `/products/${product.slug}`,
      status: "active"
    });

    if (!error) {
      return;
    }
    if (!isUniqueViolation(error)) {
      throw new Error(`Could not create affiliate link: ${error.message}`);
    }
  }
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
    status: row.status as MvpCommission["status"],
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
  status: MvpCommission["status"]
) {
  return sum(
    commissions
      .filter((commission) => commission.status === status)
      .map((commission) => commission.amount_cents)
  );
}

function createRandomToken(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let index = 0; index < length; index += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
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

function collectionFallbackImage(collectionSlug: ProductCollectionSlug) {
  const fallbackByCollection: Record<ProductCollectionSlug, string> = {
    "daily-glow": "daily-k-glow-set.png",
    "k-pop-idol": "k-pop-idol-look.png",
    "glass-skin": "glass-skin-starter.png",
    "y2k-cute": "y2k-cute-bomb.png",
    "cool-tone": "cool-tone-drama.png",
    "warm-tone": "warm-honey-look.png",
    "date-night": "daily-k-glow-set.png"
  };

  return fallbackByCollection[collectionSlug];
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

function getProductCollectionSlug(value: string | null) {
  if (!value) {
    return undefined;
  }
  return productCollectionSlugs.includes(value as ProductCollectionSlug)
    ? (value as ProductCollectionSlug)
    : undefined;
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

function sortBySortOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function resetMvpStoreForTests() {
  // The MVP store is now backed by Supabase; tests should mock at the data layer
  // instead of mutating a process-local singleton.
}
