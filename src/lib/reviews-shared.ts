import type { OrderStatus } from "./commerce";

export const reviewSortOptions = [
  "popular",
  "newest",
  "rating_high",
  "rating_low",
  "photo_first",
  "text_first"
] as const;

export type ReviewSort = (typeof reviewSortOptions)[number];

export type ProductReviewImage = {
  id: string;
  imagePath: string;
  publicUrl: string;
  sortOrder: number;
};

export type ProductReview = {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  orderId: string;
  orderNumber?: string;
  orderItemId: string;
  profileId: string;
  rating: number;
  body?: string;
  status: "visible" | "hidden";
  helpfulCount: number;
  helpfulByViewer: boolean;
  hasImages: boolean;
  authorName: string;
  verifiedPurchase: true;
  hiddenAt?: string;
  hiddenReason?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  images: ProductReviewImage[];
};

export type ProductReviewSummary = {
  count: number;
  averageRating: number;
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type ProductReviewsPayload = {
  reviews: ProductReview[];
  ownerReviews?: ProductReview[];
  summary: ProductReviewSummary;
  sort: ReviewSort;
  total: number;
};

export type ReviewEligibilityItem = {
  orderId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  productSlug?: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  existingReviewId?: string;
  existingReviewDeleted: boolean;
  canReview: boolean;
};

export type ProductReviewEligibility = {
  canReview: boolean;
  items: ReviewEligibilityItem[];
  reason?: string;
};

export function normalizeReviewSort(raw: string | null | undefined): ReviewSort {
  return reviewSortOptions.includes(raw as ReviewSort) ? (raw as ReviewSort) : "popular";
}

export function createEmptyReviewSummary(): ProductReviewSummary {
  return {
    count: 0,
    averageRating: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
}
