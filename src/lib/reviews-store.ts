import type { SupabaseClient } from "@supabase/supabase-js";
import { getUploadImageExtension, validateUploadImageFile } from "./image-upload";
import type { OrderStatus } from "./commerce";
import { getBrandProductForUser, listBrandProductsForUser } from "./brand-store";
import {
  createEmptyReviewSummary,
  type ProductReview,
  type ProductReviewEligibility,
  type ProductReviewSummary,
  type ProductReviewsPayload,
  type ReviewSort
} from "./reviews-shared";
import { createSupabasePrivilegedClient } from "./supabase/admin";

export {
  createEmptyReviewSummary,
  normalizeReviewSort,
  type ProductReview,
  type ProductReviewEligibility,
  type ProductReviewImage,
  type ProductReviewSummary,
  type ProductReviewsPayload,
  type ReviewEligibilityItem,
  type ReviewSort,
  reviewSortOptions
} from "./reviews-shared";

type ReviewRow = {
  id: string;
  product_id: string;
  order_id: string;
  order_item_id: string;
  profile_id: string;
  rating: number;
  body: string | null;
  status: "visible" | "hidden";
  hidden_at: string | null;
  hidden_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | Array<{
    full_name?: string | null;
    email?: string | null;
  }> | null;
  author?: { full_name?: string | null; email?: string | null } | Array<{
    full_name?: string | null;
    email?: string | null;
  }> | null;
  product_review_images?: ImageRow[] | null;
  product_review_helpful_votes?: HelpfulVoteRow[] | null;
  products?: { name?: string | null; slug?: string | null } | Array<{
    name?: string | null;
    slug?: string | null;
  }> | null;
  orders?: { order_number?: string | null } | Array<{ order_number?: string | null }> | null;
};

type ImageRow = {
  id: string;
  image_path: string;
  public_url: string;
  sort_order: number;
};

type HelpfulVoteRow = {
  profile_id: string;
};

type OrderEligibilityRow = {
  id: string;
  status: OrderStatus;
  order_number: string;
  order_items?: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    products?: { slug?: string | null } | Array<{ slug?: string | null }> | null;
  }> | {
    id: string;
    product_id: string | null;
    product_name: string;
    products?: { slug?: string | null } | Array<{ slug?: string | null }> | null;
  } | null;
  payment_transactions?: Array<{
    status?: string | null;
    provider_capture_id?: string | null;
  }> | {
    status?: string | null;
    provider_capture_id?: string | null;
  } | null;
};

type OrderItemEligibilityRow = {
  id: string;
  product_id: string | null;
  order_id: string;
  product_name: string;
  orders?: {
    id: string;
    user_id: string | null;
    status: OrderStatus;
    payment_transactions?: Array<{
      status?: string | null;
      provider_capture_id?: string | null;
    }> | {
      status?: string | null;
      provider_capture_id?: string | null;
    } | null;
  } | Array<{
    id: string;
    user_id: string | null;
    status: OrderStatus;
    payment_transactions?: Array<{
      status?: string | null;
      provider_capture_id?: string | null;
    }> | {
      status?: string | null;
      provider_capture_id?: string | null;
    } | null;
  }> | null;
};

export class ReviewInputError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
  }
}

export class ReviewForbiddenError extends Error {
  status = 403;

  constructor(message = "Review access denied") {
    super(message);
  }
}

export class ReviewNotFoundError extends Error {
  status = 404;

  constructor(message = "Review not found") {
    super(message);
  }
}

export class ReviewConflictError extends Error {
  status = 409;

  constructor(message = "Review already exists for this order item") {
    super(message);
  }
}

export function validateReviewRating(value: unknown) {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewInputError("Rating must be an integer from 1 to 5");
  }
  return rating;
}

export function normalizeReviewBody(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const body = String(value).trim();
  if (body.length > 5000) {
    throw new ReviewInputError("Review body must be 5000 characters or fewer");
  }
  return body || null;
}

export async function listProductReviews({
  productId,
  sort = "popular",
  viewerId,
  limit = 20,
  offset = 0,
  requireActiveProduct = true,
  includeOwnerReviews = Boolean(viewerId)
}: {
  productId: string;
  sort?: ReviewSort;
  viewerId?: string;
  limit?: number;
  offset?: number;
  requireActiveProduct?: boolean;
  includeOwnerReviews?: boolean;
}): Promise<ProductReviewsPayload> {
  const supabase = createSupabasePrivilegedClient();
  if (requireActiveProduct && !(await productAllowsPublicReviews(supabase, productId))) {
    return {
      reviews: [],
      ownerReviews: [],
      summary: createEmptyReviewSummary(),
      sort,
      total: 0
    };
  }

  const [rows, ownerRows] = await Promise.all([
    loadReviewRows(supabase, { productId, publicOnly: true }),
    includeOwnerReviews && viewerId
      ? loadOwnerReviewRowsForProduct(supabase, { productId, userId: viewerId })
      : Promise.resolve([])
  ]);
  const reviews = rows.map((row) => mapReviewRow(row, viewerId));
  const sorted = sortReviews(reviews, sort);
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(Math.max(1, limit), 50);

  return {
    reviews: sorted.slice(safeOffset, safeOffset + safeLimit),
    ownerReviews: ownerRows.map((row) => mapReviewRow(row, viewerId)),
    summary: summarizeReviews(reviews),
    sort,
    total: reviews.length
  };
}

export async function getProductReviewSummary(productId: string): Promise<ProductReviewSummary> {
  const supabase = createSupabasePrivilegedClient();
  const rows = await loadReviewRows(supabase, { productId, publicOnly: true });
  return summarizeReviews(rows.map((row) => mapReviewRow(row)));
}

export async function listAdminProductReviews({
  status = "all",
  limit = 100
}: {
  status?: "all" | "visible" | "hidden" | "deleted";
  limit?: number;
} = {}) {
  const supabase = createSupabasePrivilegedClient();
  let query = supabase
    .from("product_reviews")
    .select(
      "id,product_id,order_id,order_item_id,profile_id,rating,body,status,hidden_at,hidden_reason,deleted_at,created_at,updated_at,author:profiles!product_reviews_profile_id_fkey(full_name,email),products(name,slug),orders(order_number),product_review_images(id,image_path,public_url,sort_order),product_review_helpful_votes(profile_id)"
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(1, limit), 200));

  if (status === "visible" || status === "hidden") {
    query = query.eq("status", status).is("deleted_at", null);
  } else if (status === "deleted") {
    query = query.not("deleted_at", "is", null);
  }

  const { data, error } = await query;
  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load admin reviews: ${error.message}`);
  }

  return ((data ?? []) as ReviewRow[]).map((row) => mapReviewRow(row));
}

export async function listBrandProductReviewsForUser({
  userId,
  productId
}: {
  userId: string;
  productId: string;
}) {
  await getBrandProductForUser({ userId, productId });
  return listProductReviews({
    productId,
    sort: "newest",
    viewerId: userId,
    limit: 100,
    requireActiveProduct: false,
    includeOwnerReviews: false
  });
}

export async function listBrandReviewOverviewForUser(userId: string) {
  const assignments = await listBrandProductsForUser(userId);
  const results = await Promise.all(
    assignments.map(async ({ product, brand }) => {
      const payload = await listProductReviews({
        productId: product.id,
        sort: "newest",
        viewerId: userId,
        limit: 5,
        requireActiveProduct: false,
        includeOwnerReviews: false
      });
      return {
        product,
        brand,
        ...payload
      };
    })
  );

  return results;
}

export async function getReviewEligibilityForProduct({
  userId,
  productId
}: {
  userId: string;
  productId: string;
}): Promise<ProductReviewEligibility> {
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,status,order_number,order_items(id,product_id,product_name,products(slug)),payment_transactions(status,provider_capture_id)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load review eligibility: ${error.message}`);
  }

  const candidateItems = ((data ?? []) as OrderEligibilityRow[]).flatMap((order) => {
    const orderItems = asArray(order.order_items).filter((item) => item.product_id === productId);
    const hasPayment = hasCompletedPaymentEvidence(order.payment_transactions);
    return orderItems.map((item) => ({
      order,
      item,
      hasPayment
    }));
  });

  if (candidateItems.length === 0) {
    return { canReview: false, items: [], reason: "No purchased order item was found." };
  }

  const reviewRows = await loadReviewsForOrderItems(
    supabase,
    candidateItems.map(({ item }) => item.id)
  );
  const reviewsByOrderItem = new Map(reviewRows.map((review) => [review.order_item_id, review]));
  const items = candidateItems.map(({ order, item, hasPayment }) => {
    const existing = reviewsByOrderItem.get(item.id);
    const canReview = isEligibleOrderStatus(order.status) && hasPayment && !existing;
    const productRelation = getRelationObject<{ slug?: string | null }>(item.products);
    return {
      orderId: order.id,
      orderItemId: item.id,
      productId,
      productName: item.product_name,
      productSlug: productRelation?.slug ?? undefined,
      orderNumber: order.order_number,
      orderStatus: order.status,
      existingReviewId: existing?.id,
      existingReviewDeleted: Boolean(existing?.deleted_at),
      canReview
    };
  });

  return {
    canReview: items.some((item) => item.canReview),
    items,
    reason: items.some((item) => item.canReview)
      ? undefined
      : "No eligible paid order item is available for review."
  };
}

export async function createProductReview({
  userId,
  orderItemId,
  rating,
  body,
  imageFiles = []
}: {
  userId: string;
  orderItemId: string;
  rating: number;
  body?: string | null;
  imageFiles?: File[];
}) {
  const normalizedRating = validateReviewRating(rating);
  const normalizedBody = normalizeReviewBody(body);
  await validateReviewImageFiles(imageFiles);

  const supabase = createSupabasePrivilegedClient();
  const eligibility = await getOrderItemEligibility(supabase, { userId, orderItemId });

  const existingReview = await getReviewByOrderItemId(supabase, orderItemId);
  if (existingReview) {
    throw new ReviewConflictError();
  }

  const { data: inserted, error } = await supabase
    .from("product_reviews")
    .insert({
      product_id: eligibility.productId,
      order_id: eligibility.orderId,
      order_item_id: orderItemId,
      profile_id: userId,
      rating: normalizedRating,
      body: normalizedBody
    })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ReviewConflictError();
    }
    throw new Error(`Could not create review: ${error.message}`);
  }

  const reviewId = inserted.id as string;
  try {
    if (imageFiles.length > 0) {
      await replaceReviewImages(supabase, {
        reviewId,
        productId: eligibility.productId,
        imageFiles
      });
    }
    return getReviewByIdOrThrow(reviewId, userId);
  } catch (error) {
    await cleanupFailedReviewCreate(supabase, reviewId);
    throw error;
  }
}

export async function updateProductReview({
  userId,
  reviewId,
  rating,
  body,
  imageFiles,
  replaceImages = false
}: {
  userId: string;
  reviewId: string;
  rating: number;
  body?: string | null;
  imageFiles?: File[];
  replaceImages?: boolean;
}) {
  const normalizedRating = validateReviewRating(rating);
  const normalizedBody = normalizeReviewBody(body);
  const nextImages = imageFiles ?? [];
  await validateReviewImageFiles(nextImages);

  const supabase = createSupabasePrivilegedClient();
  const review = await getMutableReviewForOwner(supabase, { reviewId, userId });
  const { error } = await supabase
    .from("product_reviews")
    .update({
      rating: normalizedRating,
      body: normalizedBody
    })
    .eq("id", reviewId);

  if (error) {
    throw new Error(`Could not update review: ${error.message}`);
  }

  if (replaceImages) {
    try {
      await replaceReviewImages(supabase, {
        reviewId,
        productId: review.product_id,
        imageFiles: nextImages
      });
    } catch (error) {
      await rollbackReviewContent(supabase, {
        reviewId,
        rating: review.rating,
        body: review.body
      });
      throw error;
    }
  }

  return getReviewByIdOrThrow(reviewId, userId);
}

export async function deleteProductReview({
  userId,
  reviewId
}: {
  userId: string;
  reviewId: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  await getMutableReviewForOwner(supabase, { reviewId, userId });
  await softDeleteReview(supabase, { reviewId, actorId: userId });
}

export async function hideProductReview({
  adminId,
  reviewId,
  hidden,
  reason
}: {
  adminId: string;
  reviewId: string;
  hidden: boolean;
  reason?: string | null;
}) {
  const supabase = createSupabasePrivilegedClient();
  const existing = await getReviewRowById(supabase, reviewId);
  if (!existing) {
    throw new ReviewNotFoundError();
  }
  if (existing.deleted_at) {
    throw new ReviewConflictError("Deleted reviews cannot be moderated");
  }

  const { error } = await supabase
    .from("product_reviews")
    .update({
      status: hidden ? "hidden" : "visible",
      hidden_at: hidden ? new Date().toISOString() : null,
      hidden_by: hidden ? adminId : null,
      hidden_reason: hidden ? normalizeHiddenReason(reason) : null
    })
    .eq("id", reviewId);

  if (error) {
    throw new Error(`Could not moderate review: ${error.message}`);
  }

  return getReviewByIdOrThrow(reviewId, adminId);
}

export async function deleteProductReviewAsAdmin({
  adminId,
  reviewId
}: {
  adminId: string;
  reviewId: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const existing = await getReviewRowById(supabase, reviewId);
  if (!existing) {
    throw new ReviewNotFoundError();
  }
  await softDeleteReview(supabase, { reviewId, actorId: adminId });
}

export async function toggleReviewHelpfulVote({
  userId,
  reviewId
}: {
  userId: string;
  reviewId: string;
}) {
  const supabase = createSupabasePrivilegedClient();
  const review = await getReviewRowById(supabase, reviewId);
  if (!review || review.deleted_at || review.status !== "visible") {
    throw new ReviewNotFoundError();
  }

  const { data: existing, error: existingError } = await supabase
    .from("product_review_helpful_votes")
    .select("review_id")
    .eq("review_id", reviewId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not load helpful vote: ${existingError.message}`);
  }

  if (existing) {
    const { error } = await supabase
      .from("product_review_helpful_votes")
      .delete()
      .eq("review_id", reviewId)
      .eq("profile_id", userId);
    if (error) {
      throw new Error(`Could not remove helpful vote: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("product_review_helpful_votes").insert({
      review_id: reviewId,
      profile_id: userId
    });
    if (error && !isUniqueViolation(error)) {
      throw new Error(`Could not add helpful vote: ${error.message}`);
    }
  }

  const nextReview = await getReviewByIdOrThrow(reviewId, userId);
  return {
    helpfulCount: nextReview.helpfulCount,
    voted: !existing
  };
}

async function loadReviewRows(
  supabase: SupabaseClient,
  {
    productId,
    publicOnly
  }: {
    productId: string;
    publicOnly: boolean;
  }
) {
  let query = supabase
    .from("product_reviews")
    .select(
      "id,product_id,order_id,order_item_id,profile_id,rating,body,status,hidden_at,hidden_reason,deleted_at,created_at,updated_at,author:profiles!product_reviews_profile_id_fkey(full_name,email),product_review_images(id,image_path,public_url,sort_order),product_review_helpful_votes(profile_id)"
    )
    .eq("product_id", productId);

  if (publicOnly) {
    query = query.eq("status", "visible").is("deleted_at", null);
  }

  const { data, error } = await query;
  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load reviews: ${error.message}`);
  }

  return (data ?? []) as ReviewRow[];
}

async function productAllowsPublicReviews(supabase: SupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id,status")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load product review visibility: ${error.message}`);
  }

  return (data as { status?: string } | null)?.status === "active";
}

async function loadReviewsForOrderItems(supabase: SupabaseClient, orderItemIds: string[]) {
  if (orderItemIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id,order_item_id,deleted_at,status")
    .in("order_item_id", orderItemIds);

  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load existing reviews: ${error.message}`);
  }

  return (data ?? []) as Array<{
    id: string;
    order_item_id: string;
    deleted_at: string | null;
    status: string;
  }>;
}

async function loadOwnerReviewRowsForProduct(
  supabase: SupabaseClient,
  {
    productId,
    userId
  }: {
    productId: string;
    userId: string;
  }
) {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(
      "id,product_id,order_id,order_item_id,profile_id,rating,body,status,hidden_at,hidden_reason,deleted_at,created_at,updated_at,author:profiles!product_reviews_profile_id_fkey(full_name,email),product_review_images(id,image_path,public_url,sort_order),product_review_helpful_votes(profile_id)"
    )
    .eq("product_id", productId)
    .eq("profile_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load owner reviews: ${error.message}`);
  }

  return (data ?? []) as ReviewRow[];
}

async function getReviewByOrderItemId(supabase: SupabaseClient, orderItemId: string) {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id,order_item_id,deleted_at")
    .eq("order_item_id", orderItemId)
    .maybeSingle();

  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return null;
    }
    throw new Error(`Could not load existing review: ${error.message}`);
  }

  return data as { id: string; order_item_id: string; deleted_at: string | null } | null;
}

async function getReviewRowById(supabase: SupabaseClient, reviewId: string) {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(
      "id,product_id,order_id,order_item_id,profile_id,rating,body,status,hidden_at,hidden_reason,deleted_at,created_at,updated_at,author:profiles!product_reviews_profile_id_fkey(full_name,email),product_review_images(id,image_path,public_url,sort_order),product_review_helpful_votes(profile_id)"
    )
    .eq("id", reviewId)
    .maybeSingle();

  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return null;
    }
    throw new Error(`Could not load review: ${error.message}`);
  }

  return data as ReviewRow | null;
}

async function getReviewByIdOrThrow(reviewId: string, viewerId?: string) {
  const supabase = createSupabasePrivilegedClient();
  const review = await getReviewRowById(supabase, reviewId);
  if (!review) {
    throw new ReviewNotFoundError();
  }
  return mapReviewRow(review, viewerId);
}

async function getMutableReviewForOwner(
  supabase: SupabaseClient,
  {
    reviewId,
    userId
  }: {
    reviewId: string;
    userId: string;
  }
) {
  const review = await getReviewRowById(supabase, reviewId);
  if (!review) {
    throw new ReviewNotFoundError();
  }
  if (review.profile_id !== userId) {
    throw new ReviewForbiddenError();
  }
  if (review.deleted_at) {
    throw new ReviewConflictError("Deleted reviews cannot be changed");
  }
  return review;
}

async function getOrderItemEligibility(
  supabase: SupabaseClient,
  {
    userId,
    orderItemId
  }: {
    userId: string;
    orderItemId: string;
  }
) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id,product_id,order_id,product_name,orders(id,user_id,status,payment_transactions(status,provider_capture_id))")
    .eq("id", orderItemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load order item: ${error.message}`);
  }

  if (!data) {
    throw new ReviewNotFoundError("Order item not found");
  }

  const row = data as OrderItemEligibilityRow;
  const order = getRelationObject(row.orders);
  if (!order || order.user_id !== userId) {
    throw new ReviewForbiddenError("Order item does not belong to this user");
  }
  if (!row.product_id) {
    throw new ReviewForbiddenError("Order item is not tied to a product");
  }
  if (!isEligibleOrderStatus(order.status) || !hasCompletedPaymentEvidence(order.payment_transactions)) {
    throw new ReviewForbiddenError("Order item is not eligible for review");
  }

  return {
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name
  };
}

async function validateReviewImageFiles(files: File[]) {
  if (files.length > 5) {
    throw new ReviewInputError("A review can include up to 5 photos");
  }

  for (const file of files) {
    const validationError = await validateUploadImageFile(file);
    if (validationError) {
      throw new ReviewInputError(validationError);
    }
  }
}

async function replaceReviewImages(
  supabase: SupabaseClient,
  {
    reviewId,
    productId,
    imageFiles
  }: {
    reviewId: string;
    productId: string;
    imageFiles: File[];
  }
) {
  const previousImages = await loadReviewImages(supabase, reviewId);
  const uploadedPaths: string[] = [];
  let previousRowsDeleted = false;

  try {
    const nextRows = [];
    const batchId = Date.now();
    for (const [index, file] of imageFiles.entries()) {
      const sortOrder = index + 1;
      const imagePath = `reviews/${productId}/${reviewId}/${sortOrder}-${batchId}-${safeFileStem(file.name)}.${getUploadImageExtension(file)}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(imagePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Could not upload review image: ${uploadError.message}`);
      }

      uploadedPaths.push(imagePath);
      const { data } = supabase.storage.from("product-images").getPublicUrl(imagePath);
      nextRows.push({
        review_id: reviewId,
        image_path: imagePath,
        public_url: data.publicUrl,
        sort_order: sortOrder
      });
    }

    if (previousImages.length > 0) {
      const { error: deleteError } = await supabase
        .from("product_review_images")
        .delete()
        .eq("review_id", reviewId);

      if (deleteError) {
        throw new Error(`Could not replace review images: ${deleteError.message}`);
      }
      previousRowsDeleted = true;
    }

    if (nextRows.length > 0) {
      const { error: insertError } = await supabase.from("product_review_images").insert(nextRows);
      if (insertError) {
        throw new Error(`Could not save review images: ${insertError.message}`);
      }
    }

    if (previousImages.length > 0) {
      await supabase.storage.from("product-images").remove(
        previousImages.map((image) => image.image_path).filter(Boolean)
      );
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("product-images").remove(uploadedPaths);
    }
    if (previousRowsDeleted && previousImages.length > 0) {
      await supabase.from("product_review_images").delete().eq("review_id", reviewId);
      await supabase.from("product_review_images").insert(
        previousImages.map((image) => ({
          id: image.id,
          review_id: reviewId,
          image_path: image.image_path,
          public_url: image.public_url,
          sort_order: image.sort_order
        }))
      );
    }
    throw error;
  }
}

async function rollbackReviewContent(
  supabase: SupabaseClient,
  {
    reviewId,
    rating,
    body
  }: {
    reviewId: string;
    rating: number;
    body: string | null;
  }
) {
  const { error } = await supabase
    .from("product_reviews")
    .update({ rating, body })
    .eq("id", reviewId);

  if (error) {
    throw new Error(`Could not restore review after image failure: ${error.message}`);
  }
}

async function loadReviewImages(supabase: SupabaseClient, reviewId: string) {
  const { data, error } = await supabase
    .from("product_review_images")
    .select("id,image_path,public_url,sort_order")
    .eq("review_id", reviewId);

  if (error) {
    if (isReviewSchemaMissingError(error)) {
      return [];
    }
    throw new Error(`Could not load review images: ${error.message}`);
  }

  return (data ?? []) as ImageRow[];
}

async function removeReviewImages(supabase: SupabaseClient, images: ImageRow[]) {
  const imagePaths = images.map((image) => image.image_path).filter(Boolean);
  if (imagePaths.length > 0) {
    await supabase.storage.from("product-images").remove(imagePaths);
  }

  const imageIds = images.map((image) => image.id);
  if (imageIds.length > 0) {
    const { error } = await supabase.from("product_review_images").delete().in("id", imageIds);
    if (error) {
      throw new Error(`Could not remove review images: ${error.message}`);
    }
  }
}

async function cleanupFailedReviewCreate(supabase: SupabaseClient, reviewId: string) {
  const images = await loadReviewImages(supabase, reviewId);
  if (images.length > 0) {
    await removeReviewImages(supabase, images);
  }
  await supabase.from("product_reviews").delete().eq("id", reviewId);
}

async function softDeleteReview(
  supabase: SupabaseClient,
  {
    reviewId,
    actorId
  }: {
    reviewId: string;
    actorId: string;
  }
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("product_reviews")
    .update({
      deleted_at: now,
      deleted_by: actorId
    })
    .eq("id", reviewId);

  if (error) {
    throw new Error(`Could not delete review: ${error.message}`);
  }

  await supabase.from("product_review_helpful_votes").delete().eq("review_id", reviewId);
}

function mapReviewRow(row: ReviewRow, viewerId?: string): ProductReview {
  const images = asArray(row.product_review_images)
    .map((image) => ({
      id: image.id,
      imagePath: image.image_path,
      publicUrl: image.public_url,
      sortOrder: image.sort_order
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const helpfulVotes = asArray(row.product_review_helpful_votes);
  const profile = getRelationObject(row.author ?? row.profiles);
  const product = getRelationObject(row.products);
  const order = getRelationObject(row.orders);

  return {
    id: row.id,
    productId: row.product_id,
    productName: product?.name ?? undefined,
    productSlug: product?.slug ?? undefined,
    orderId: row.order_id,
    orderNumber: order?.order_number ?? undefined,
    orderItemId: row.order_item_id,
    profileId: row.profile_id,
    rating: row.rating,
    body: row.body ?? undefined,
    status: row.status,
    helpfulCount: helpfulVotes.length,
    helpfulByViewer: viewerId
      ? helpfulVotes.some((vote) => vote.profile_id === viewerId)
      : false,
    hasImages: images.length > 0,
    authorName: getAuthorDisplayName(profile),
    verifiedPurchase: true,
    hiddenAt: row.hidden_at ?? undefined,
    hiddenReason: row.hidden_reason ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images
  };
}

function summarizeReviews(reviews: ProductReview[]): ProductReviewSummary {
  const summary = createEmptyReviewSummary();
  if (reviews.length === 0) {
    return summary;
  }

  let total = 0;
  for (const review of reviews) {
    total += review.rating;
    summary.ratingCounts[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
  }

  summary.count = reviews.length;
  summary.averageRating = Math.round((total / reviews.length) * 10) / 10;
  return summary;
}

function sortReviews(reviews: ProductReview[], sort: ReviewSort) {
  return [...reviews].sort((left, right) => {
    if (sort === "newest") {
      return byCreatedDesc(left, right) || byIdDesc(left, right);
    }
    if (sort === "rating_high") {
      return right.rating - left.rating || byHelpfulDesc(left, right) || byCreatedDesc(left, right);
    }
    if (sort === "rating_low") {
      return left.rating - right.rating || byHelpfulDesc(left, right) || byCreatedDesc(left, right);
    }
    if (sort === "photo_first") {
      return Number(right.hasImages) - Number(left.hasImages) || byHelpfulDesc(left, right) || byCreatedDesc(left, right);
    }
    if (sort === "text_first") {
      return Number(Boolean(right.body)) - Number(Boolean(left.body)) || byHelpfulDesc(left, right) || byCreatedDesc(left, right);
    }

    return byHelpfulDesc(left, right) || byCreatedDesc(left, right) || byIdDesc(left, right);
  });
}

function byHelpfulDesc(left: ProductReview, right: ProductReview) {
  return right.helpfulCount - left.helpfulCount;
}

function byCreatedDesc(left: ProductReview, right: ProductReview) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function byIdDesc(left: ProductReview, right: ProductReview) {
  return right.id.localeCompare(left.id);
}

function isEligibleOrderStatus(status: OrderStatus | undefined | null) {
  return (
    status === "paid" ||
    status === "preparing" ||
    status === "shipped" ||
    status === "delivered" ||
    status === "cancelled" ||
    status === "refunded"
  );
}

function hasCompletedPaymentEvidence(
  transactions:
    | Array<{ status?: string | null; provider_capture_id?: string | null }>
    | { status?: string | null; provider_capture_id?: string | null }
    | null
    | undefined
) {
  return asArray(transactions).some(
    (transaction) =>
      transaction.status === "COMPLETED" && Boolean(transaction.provider_capture_id?.trim())
  );
}

function normalizeHiddenReason(value: string | null | undefined) {
  const reason = value?.trim() ?? "";
  if (reason.length > 500) {
    throw new ReviewInputError("Hidden reason must be 500 characters or fewer");
  }
  return reason || null;
}

function getAuthorDisplayName(profile: { full_name?: string | null; email?: string | null } | null) {
  const fullName = profile?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const email = profile?.email?.trim();
  if (!email) {
    return "Verified buyer";
  }

  const [name, domain] = email.split("@");
  if (!name || !domain) {
    return "Verified buyer";
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function safeFileStem(name: string) {
  const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
  const safe = stem.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "review-photo";
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function isReviewSchemaMissingError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase();

  return (
    candidate.code === "PGRST200" ||
    candidate.code === "PGRST205" ||
    (message.includes("schema cache") &&
      (message.includes("product_reviews") ||
        message.includes("product_review_images") ||
        message.includes("product_review_helpful_votes")))
  );
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getRelationObject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}
