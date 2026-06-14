"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageIcon,
  Maximize2,
  Pencil,
  Star,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  type ProductReview,
  type ProductReviewEligibility,
  type ProductReviewsPayload,
  type ReviewSort,
  normalizeReviewSort,
  reviewSortOptions
} from "@/lib/reviews-shared";
import { cn } from "@/lib/utils";

type ProductReviewsSectionProps = {
  productId: string;
  productName: string;
  initialPayload?: ProductReviewsPayload;
  eligibility?: ProductReviewEligibility;
  isAuthenticated: boolean;
  viewerId?: string;
  detailContent?: ReactNode;
};

const sortLabels: Record<ReviewSort, string> = {
  popular: "Most helpful",
  newest: "Newest",
  rating_high: "Highest rating",
  rating_low: "Lowest rating",
  photo_first: "Photos first",
  text_first: "Written reviews first"
};

type ActiveReviewImage = {
  images: Array<{
    src: string;
    alt: string;
  }>;
  index: number;
  authorName: string;
  rating: number;
  createdAt: string;
};

const REVIEW_PREVIEW_COUNT = 3;
const MAX_REVIEW_BODY_LENGTH = 5000;
const MAX_REVIEW_PHOTOS = 5;

export function ProductReviewsSection({
  productId,
  productName,
  initialPayload,
  eligibility,
  isAuthenticated,
  viewerId,
  detailContent
}: ProductReviewsSectionProps) {
  const [payload, setPayload] = useState<ProductReviewsPayload>(
    initialPayload ?? {
      reviews: [],
      summary: { count: 0, averageRating: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      sort: "popular",
      total: 0
    }
  );
  const [sort, setSort] = useState<ReviewSort>(payload.sort);
  const [eligibilityState, setEligibilityState] = useState(eligibility);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<ActiveReviewImage | null>(null);
  const [pendingDeleteReview, setPendingDeleteReview] = useState<ProductReview | null>(null);
  const [helpfulPromptReviewId, setHelpfulPromptReviewId] = useState<string | null>(null);
  const [reviewReturnPath, setReviewReturnPath] = useState("#reviews");
  const formRef = useRef<HTMLFormElement>(null);
  const reviewSummaryRef = useRef<HTMLElement>(null);
  const reviewDetailsRef = useRef<HTMLDivElement>(null);

  const ownerReviews = useMemo(() => payload.ownerReviews ?? [], [payload.ownerReviews]);
  const publicReviewIds = useMemo(
    () => new Set(payload.reviews.map((review) => review.id)),
    [payload.reviews]
  );
  const extraOwnerReviews = ownerReviews.filter((review) => !publicReviewIds.has(review.id));
  const reviewableItems = eligibilityState?.items.filter((item) => item.canReview) ?? [];
  const previewReviews = payload.reviews.slice(0, REVIEW_PREVIEW_COUNT);
  const signInHref = `/auth?next=${encodeURIComponent(reviewReturnPath)}`;
  const hasHelpfulVotes = payload.reviews.some((review) => review.helpfulCount > 0);
  const activeSortLabel = getSortOptionLabel(sort, hasHelpfulVotes);

  useEffect(() => {
    setReviewReturnPath(getReviewReturnPath());
  }, []);

  async function reloadReviews(nextSort = sort) {
    const response = await fetch(`/api/products/${productId}/reviews?sort=${nextSort}`, {
      cache: "no-store"
    });
    const nextPayload = (await response.json()) as ProductReviewsPayload & { error?: string };
    if (!response.ok) {
      throw new Error(nextPayload.error ?? "Could not load reviews.");
    }
    setPayload(nextPayload);
  }

  async function changeSort(nextSort: ReviewSort) {
    setSort(nextSort);
    setBusy(true);
    setMessage("");
    setHelpfulPromptReviewId(null);
    try {
      await reloadReviews(nextSort);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update review sorting.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const submittedOrderItemId = String(formData.get("orderItemId") ?? "");
      const response = await fetch("/api/account/reviews", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as { review?: ProductReview; error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not save review.");
      }
      formRef.current?.reset();
      markOrderItemReviewed(submittedOrderItemId, result.review?.id);
      setCreateOpen(false);
      setMessage("Your review is live.");
      await reloadReviews();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setBusy(false);
    }
  }

  async function updateReview(reviewId: string, form: HTMLFormElement) {
    setBusy(true);
    setMessage("");
    try {
      const formData = new FormData(form);
      formData.set("replaceImages", formData.getAll("photos").some((file) => file instanceof File && file.size > 0) ? "true" : "false");
      const response = await fetch(`/api/account/reviews/${reviewId}`, {
        method: "PATCH",
        body: formData
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update review.");
      }
      setMessage("Your review was updated.");
      await reloadReviews();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update review.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteReview(reviewId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/account/reviews/${reviewId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete review.");
      }
      markReviewDeleted(reviewId);
      setMessage("Your review was deleted.");
      await reloadReviews();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete review.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleHelpful(reviewId: string) {
    if (!isAuthenticated) {
      setHelpfulPromptReviewId(reviewId);
      return;
    }
    setHelpfulPromptReviewId(null);
    setMessage("");
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      const result = (await response.json()) as {
        error?: string;
        helpfulCount?: number;
        voted?: boolean;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update helpful vote.");
      }
      setPayload((current) => ({
        ...current,
        reviews: current.reviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                helpfulCount: result.helpfulCount ?? review.helpfulCount,
                helpfulByViewer: Boolean(result.voted)
              }
            : review
        )
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update helpful vote.");
    }
  }

  function markOrderItemReviewed(orderItemId: string, reviewId?: string) {
    setEligibilityState((current) => {
      if (!current) {
        return current;
      }

      const items = current.items.map((item) =>
        item.orderItemId === orderItemId
          ? {
              ...item,
              existingReviewId: reviewId ?? item.existingReviewId,
              existingReviewDeleted: false,
              canReview: false
            }
          : item
      );
      return {
        ...current,
        canReview: markCanReview(items),
        items
      };
    });
  }

  function markReviewDeleted(reviewId: string) {
    const deletedReview = [...ownerReviews, ...payload.reviews].find((review) => review.id === reviewId);
    if (!deletedReview) {
      return;
    }

    setEligibilityState((current) => {
      if (!current) {
        return current;
      }

      const items = current.items.map((item) =>
        item.orderItemId === deletedReview.orderItemId
          ? {
              ...item,
              existingReviewId: reviewId,
              existingReviewDeleted: true,
              canReview: false
            }
          : item
      );
      return {
        ...current,
        canReview: markCanReview(items),
        items
      };
    });
  }

  function scrollToReviewDetails() {
    reviewDetailsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function scrollToReviewSummary() {
    reviewSummaryRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {detailContent}

      <section ref={reviewSummaryRef} id="reviews" className="border-t border-zinc-200 bg-white py-12">
        <div className="container grid gap-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.42fr)] lg:items-start">
            <div>
              <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">Verified reviews</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <h2 className="shipk-heading text-4xl leading-none">Customer reviews</h2>
                <RatingStars rating={payload.summary.averageRating} />
              </div>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                {payload.summary.count > 0
                  ? `${payload.summary.averageRating.toFixed(1)} average from ${payload.summary.count} verified review${payload.summary.count === 1 ? "" : "s"}`
                  : "No reviews yet"}
              </p>

              {previewReviews.length > 0 ? (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase text-muted-foreground">Quick review scan</p>
                    <Button type="button" variant="outline" size="sm" onClick={scrollToReviewDetails}>
                      {readAllReviewsLabel(payload.total)}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {previewReviews.map((review) => (
                      <ReviewPreviewTile key={review.id} review={review} onOpenImage={setActiveImage} />
                    ))}
                  </div>
                </div>
              ) : null}

              {message ? (
                <p role="status" className="mt-5 rounded-md border border-zinc-200 bg-[#fff8f0] p-3 text-sm font-semibold">
                  {message}
                </p>
              ) : null}
            </div>

            <ReviewSnapshot
              summary={payload.summary}
              productName={productName}
              canReview={isAuthenticated && reviewableItems.length > 0}
              isAuthenticated={isAuthenticated}
              signInHref={signInHref}
              onWriteReview={() => setCreateOpen(true)}
              busy={busy}
            />
          </div>
        </div>
      </section>

      <section id="review-details" className="border-t border-zinc-200 bg-white py-12">
        <div className="container grid gap-5">
          <div ref={reviewDetailsRef} className="grid gap-4" id="reviews-list">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">Review details</p>
                <h2 className="mt-2 shipk-heading text-4xl leading-none">Review details</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold text-muted-foreground">
                  Browse every verified buyer review, sort by rating or recency, and open review photos without leaving the product page.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={scrollToReviewSummary}>
                Back to review summary
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-2">
                <p className="text-xs font-black uppercase text-muted-foreground">Sort</p>
                <div role="radiogroup" aria-label="Sort reviews" className="flex flex-wrap gap-2">
                  {reviewSortOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={sort === option}
                      onClick={() => changeSort(normalizeReviewSort(option))}
                      disabled={busy}
                      className={cn(
                        "focus-ring inline-flex h-10 items-center rounded-md border px-3 text-sm font-black transition",
                        sort === option
                          ? "border-foreground bg-foreground text-white"
                          : "border-zinc-300 bg-white text-foreground hover:border-foreground",
                        busy && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {getSortOptionLabel(option, hasHelpfulVotes)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span>
                  Showing {payload.reviews.length} of {payload.total} · {activeSortLabel}
                </span>
                {busy ? <span>Updating...</span> : null}
              </div>
            </div>

            {extraOwnerReviews.length > 0 ? (
              <div className="grid gap-3">
                <p className="text-sm font-black uppercase text-muted-foreground">Your reviews</p>
                {extraOwnerReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isAuthor
                    isAuthenticated={isAuthenticated}
                    busy={busy}
                    onHelpful={() => toggleHelpful(review.id)}
                    showHelpfulPrompt={helpfulPromptReviewId === review.id}
                    onDelete={() => setPendingDeleteReview(review)}
                    onUpdate={(form) => updateReview(review.id, form)}
                    onOpenImage={setActiveImage}
                  />
                ))}
              </div>
            ) : null}

            {payload.reviews.length > 0 ? (
              payload.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isAuthor={Boolean(viewerId && review.profileId === viewerId)}
                  isAuthenticated={isAuthenticated}
                  busy={busy}
                  onHelpful={() => toggleHelpful(review.id)}
                  showHelpfulPrompt={helpfulPromptReviewId === review.id}
                  onDelete={() => setPendingDeleteReview(review)}
                  onUpdate={(form) => updateReview(review.id, form)}
                  onOpenImage={setActiveImage}
                />
              ))
            ) : (
              <div className="rounded-md border border-zinc-200 bg-white p-6">
                <p className="font-black">No reviews yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {productName} is waiting for its first verified buyer review.
                </p>
              </div>
            )}
            {payload.total > payload.reviews.length ? (
              <p className="rounded-md border border-zinc-200 bg-[#fff8f0] p-3 text-sm font-semibold text-muted-foreground">
                Showing the first {payload.reviews.length} reviews. Sort or refresh to review more buyer feedback.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {createOpen ? (
        <ReviewModal
          title="Write a review"
          description="Verified purchase reviews are posted publicly as soon as they are saved."
          onClose={() => setCreateOpen(false)}
        >
          <form ref={formRef} className="grid gap-4" onSubmit={submitReview}>
            <label className="grid gap-1 text-sm font-semibold">
              <span>Purchase</span>
              <select
                name="orderItemId"
                className="focus-ring h-11 rounded-md border border-zinc-300 bg-white px-3"
                required
              >
                {reviewableItems.map((item) => (
                  <option key={item.orderItemId} value={item.orderItemId}>
                    {item.orderNumber} · {item.productName}
                  </option>
                ))}
              </select>
            </label>
            <ReviewFields />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Post review
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </ReviewModal>
      ) : null}

      {activeImage ? <ReviewImageLightbox image={activeImage} onClose={() => setActiveImage(null)} /> : null}
      {pendingDeleteReview ? (
        <ReviewModal
          title="Delete review?"
          description="This review will be removed from the public product page."
          onClose={() => setPendingDeleteReview(null)}
        >
          <div className="grid gap-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Deleting keeps the purchase record, but the review and its public feedback will no longer be visible.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const reviewId = pendingDeleteReview.id;
                  setPendingDeleteReview(null);
                  void deleteReview(reviewId);
                }}
                disabled={busy}
              >
                Delete review
              </Button>
              <Button type="button" variant="outline" onClick={() => setPendingDeleteReview(null)}>
                Keep review
              </Button>
            </div>
          </div>
        </ReviewModal>
      ) : null}
    </>
  );
}

function markCanReview(items: ProductReviewEligibility["items"]) {
  return items.some((item) => item.canReview);
}

function readAllReviewsLabel(total: number) {
  return total === 1 ? "Read 1 review" : `Read all ${total} reviews`;
}

function getSortOptionLabel(option: ReviewSort, hasHelpfulVotes: boolean) {
  return option === "popular" && !hasHelpfulVotes ? "Recommended" : sortLabels[option];
}

function getReviewReturnPath() {
  if (typeof window === "undefined") {
    return "#reviews";
  }

  const { pathname, search } = window.location;
  return `${pathname}${search}#reviews`;
}

function getReviewPhotoGallery(review: ProductReview, reviewerName: string) {
  return review.images.map((image, index) => ({
    src: image.publicUrl || image.imagePath,
    alt: `Review photo ${index + 1} from ${reviewerName}`
  }));
}

function ReviewSnapshot({
  summary,
  productName,
  canReview,
  isAuthenticated,
  signInHref,
  onWriteReview,
  busy
}: {
  summary: ProductReviewsPayload["summary"];
  productName: string;
  canReview: boolean;
  isAuthenticated: boolean;
  signInHref: string;
  onWriteReview: () => void;
  busy: boolean;
}) {
  return (
    <aside className="rounded-md border border-zinc-200 bg-white p-4">
      <div>
        <p className="text-xs font-black uppercase text-muted-foreground">Review snapshot</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-black">{summary.averageRating.toFixed(1)}</span>
          <RatingStars rating={summary.averageRating} />
        </div>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {summary.count > 0
            ? `${summary.count} verified buyer review${summary.count === 1 ? "" : "s"}`
            : `Be the first paid buyer to review ${productName}.`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.ratingCounts[rating as 1 | 2 | 3 | 4 | 5];
          const percent = summary.count ? (count / summary.count) * 100 : 0;
          return (
            <div key={rating} className="contents">
              <span className="font-black">{rating}★</span>
              <span className="grid grid-cols-[1fr_auto] items-center gap-2">
                <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <span className="block h-full bg-[#ffe25a]" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </span>
            </div>
          );
        })}
      </div>

      {canReview ? (
        <Button type="button" className="mt-4 w-full" onClick={onWriteReview} disabled={busy}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Write a review
        </Button>
      ) : isAuthenticated ? (
        <p className="mt-4 rounded-md border border-zinc-200 bg-[#fff8f0] p-3 text-sm font-semibold text-muted-foreground">
          Paid purchases unlock public reviews.
        </p>
      ) : (
        <Link href={signInHref} className={cn(buttonVariants(), "mt-4 w-full")}>
          Sign in to review
        </Link>
      )}
    </aside>
  );
}

function ReviewPreviewTile({
  review,
  onOpenImage
}: {
  review: ProductReview;
  onOpenImage: (image: ActiveReviewImage) => void;
}) {
  const firstImage = review.images[0];
  const reviewerName = formatReviewerName(review.authorName);
  const body = getDisplayReviewBody(review.body);
  const gallery = getReviewPhotoGallery(review, reviewerName);

  return (
    <article className="grid min-h-40 gap-3 rounded-md border border-zinc-200 bg-[#fff8f0] p-3">
      {firstImage ? (
        <div className="grid grid-cols-[5.5rem_1fr] gap-3">
          <ReviewPhotoButton
            src={firstImage.publicUrl || firstImage.imagePath}
            alt=""
            ariaLabel={`Open review photo from ${reviewerName}`}
            sizes="96px"
            className="bg-white"
            countLabel={gallery.length > 1 ? `${gallery.length} photos` : undefined}
            onClick={() =>
              onOpenImage({
                images: gallery,
                index: 0,
                authorName: reviewerName,
                rating: review.rating,
                createdAt: review.createdAt
              })
            }
          />
          <div className="min-w-0">
            <RatingStars rating={review.rating} size="sm" />
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6">
              {body || "Photo review"}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <RatingStars rating={review.rating} size="sm" />
          <p className="mt-2 line-clamp-4 text-sm font-semibold leading-6">
            {body || "Rating only"}
          </p>
        </div>
      )}
      <p className="self-end text-xs font-black text-muted-foreground">{reviewerName}</p>
    </article>
  );
}

function ReviewPhotoButton({
  src,
  alt,
  ariaLabel,
  sizes,
  className,
  countLabel,
  onClick
}: {
  src: string;
  alt: string;
  ariaLabel: string;
  sizes: string;
  className?: string;
  countLabel?: string;
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group focus-ring relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50",
        className
      )}
      aria-label={ariaLabel}
    >
      {imageFailed ? (
        <PhotoUnavailable />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          className="object-cover transition duration-200 group-hover:scale-105"
          onError={() => setImageFailed(true)}
        />
      )}
      {countLabel ? (
        <span className="absolute left-2 top-2 rounded-full border border-zinc-200 bg-white/95 px-2 py-1 text-xs font-black text-foreground">
          {countLabel}
        </span>
      ) : null}
      <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white/90 text-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

function PhotoUnavailable() {
  return (
    <span className="absolute inset-0 grid place-items-center bg-zinc-50 px-2 text-center text-xs font-black text-muted-foreground">
      <span className="grid justify-items-center gap-1">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
        <span>Photo unavailable</span>
      </span>
    </span>
  );
}

function ReviewPhotoThumbnailButton({
  thumbnail,
  index,
  isCurrent,
  onClick
}: {
  thumbnail: ActiveReviewImage["images"][number];
  index: number;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show review photo ${index + 1}`}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "focus-ring relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-zinc-50",
        isCurrent ? "border-foreground" : "border-zinc-200"
      )}
    >
      {imageFailed ? (
        <span className="absolute inset-0 grid place-items-center text-muted-foreground">
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : (
        <Image
          src={thumbnail.src}
          alt=""
          fill
          sizes="64px"
          unoptimized
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
      <span className="absolute bottom-1 right-1 rounded-full border border-zinc-200 bg-white/95 px-1.5 text-[0.625rem] font-black leading-5 text-foreground">
        {index + 1}
      </span>
    </button>
  );
}

function ReviewModal({
  title,
  description,
  onClose,
  children
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 py-6" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        tabIndex={-1}
        className="max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="review-dialog-title" className="text-2xl font-black">
              {title}
            </h3>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white"
            aria-label="Close review dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  isAuthor,
  isAuthenticated,
  busy,
  onHelpful,
  showHelpfulPrompt,
  onDelete,
  onUpdate,
  onOpenImage
}: {
  review: ProductReview;
  isAuthor: boolean;
  isAuthenticated: boolean;
  busy: boolean;
  onHelpful: () => void;
  showHelpfulPrompt: boolean;
  onDelete: () => void;
  onUpdate: (form: HTMLFormElement) => void;
  onOpenImage: (image: ActiveReviewImage) => void;
}) {
  const [editing, setEditing] = useState(false);
  const reviewerName = formatReviewerName(review.authorName);
  const displayBody = getDisplayReviewBody(review.body);
  const gallery = getReviewPhotoGallery(review, reviewerName);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-[#fff8f0] text-sm font-black uppercase">
            {getReviewerInitials(reviewerName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black">{reviewerName}</p>
              <Badge className="gap-1 border border-[#bfe45a] bg-[#f0fad8] text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Verified purchase
              </Badge>
              {review.status === "hidden" ? (
                <Badge className="bg-zinc-200 text-foreground">Hidden</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars rating={review.rating} />
          </div>
          <button
            type="button"
            onClick={onHelpful}
            disabled={busy || review.status !== "visible"}
            className={cn(
              "focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-black",
              review.helpfulByViewer ? "bg-[#ffe25a]" : "bg-white",
              review.status !== "visible" && "cursor-not-allowed opacity-60"
            )}
            aria-pressed={review.helpfulByViewer}
            aria-label={
              isAuthenticated
                ? `Helpful ${review.helpfulCount}`
                : `Sign in to mark helpful. ${review.helpfulCount} helpful votes`
            }
            title={isAuthenticated ? "Mark this review helpful" : "Sign in to mark helpful"}
          >
            <Heart className={cn("h-4 w-4", review.helpfulByViewer && "fill-current")} aria-hidden="true" />
            Helpful {review.helpfulCount}
          </button>
          {showHelpfulPrompt ? (
            <p role="status" className="basis-full rounded-md border border-zinc-200 bg-[#fff8f0] px-3 py-2 text-left text-sm font-semibold">
              Sign in to mark this review helpful.
            </p>
          ) : null}
        </div>
      </div>

      {displayBody ? (
        <p className="mt-4 whitespace-pre-line leading-7">{displayBody}</p>
      ) : (
        <Badge className="mt-4 w-fit border border-zinc-200 bg-zinc-50 text-muted-foreground">
          Rating only
        </Badge>
      )}
      {review.images.length > 0 ? (
        <div
          data-testid={`review-photo-row-${review.id}`}
          className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-2"
        >
          {review.images.map((image, index) => (
            <ReviewPhotoButton
              key={image.id}
              src={image.publicUrl || image.imagePath}
              alt="Review photo"
              ariaLabel={`Open review photo ${index + 1} from ${reviewerName}`}
              sizes="(min-width: 1024px) 192px, (min-width: 640px) 160px, 144px"
              className="w-36 shrink-0 sm:w-40 lg:w-48"
              countLabel={review.images.length > 1 ? `${index + 1}/${review.images.length}` : undefined}
              onClick={() =>
                onOpenImage({
                  images: gallery,
                  index,
                  authorName: reviewerName,
                  rating: review.rating,
                  createdAt: review.createdAt
                })
              }
            />
          ))}
        </div>
      ) : null}

      {editing ? (
        <ReviewModal
          title="Edit review"
          description="Changes are reflected on the public product page after saving."
          onClose={() => setEditing(false)}
        >
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onUpdate(event.currentTarget);
              setEditing(false);
            }}
          >
            <ReviewFields defaultRating={review.rating} defaultBody={review.body ?? ""} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                Save changes
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </ReviewModal>
      ) : null}

      {isAuthor && !editing ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDelete} disabled={busy}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function ReviewImageLightbox({
  image,
  onClose
}: {
  image: ActiveReviewImage;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(image.index);
  const [imageFailed, setImageFailed] = useState(false);
  const imageCount = image.images.length;
  const currentImage = image.images[currentIndex] ?? image.images[0];
  const hasMultipleImages = imageCount > 1;

  useEffect(() => {
    setCurrentIndex(image.index);
  }, [image.index]);

  useEffect(() => {
    setImageFailed(false);
  }, [currentImage?.src]);

  const goToPreviousImage = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }
    setCurrentIndex((current) => (current - 1 + imageCount) % imageCount);
  }, [hasMultipleImages, imageCount]);

  const goToNextImage = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }
    setCurrentIndex((current) => (current + 1) % imageCount);
  }, [hasMultipleImages, imageCount]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        goToPreviousImage();
      } else if (event.key === "ArrowRight") {
        goToNextImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextImage, goToPreviousImage, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-photo-title"
        className="grid max-h-[calc(100vh-3rem)] w-full max-w-5xl gap-3 overflow-hidden rounded-md bg-white p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-1">
          <div>
            <h3 id="review-photo-title" className="text-lg font-black">
              Review photo
            </h3>
            <p className="text-sm font-semibold text-muted-foreground">
              {image.authorName} · {image.rating} star{image.rating === 1 ? "" : "s"} · {formatDate(image.createdAt)}
            </p>
            {hasMultipleImages ? (
              <p className="mt-1 text-xs font-black text-muted-foreground">
                {currentIndex + 1} / {imageCount}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white"
            aria-label="Close review photo"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative h-[62vh] min-h-72 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
          {currentImage && !imageFailed ? (
            <Image
              src={currentImage.src}
              alt={currentImage.alt}
              fill
              sizes="100vw"
              unoptimized
              className="object-contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <PhotoUnavailable />
          )}
          {hasMultipleImages ? (
            <>
              <button
                type="button"
                onClick={goToPreviousImage}
                className="focus-ring absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 transition hover:bg-white"
                aria-label="Previous review photo"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goToNextImage}
                className="focus-ring absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 transition hover:bg-white"
                aria-label="Next review photo"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
        {hasMultipleImages ? (
          <div className="flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Review photo thumbnails">
            {image.images.map((thumbnail, index) => (
              <ReviewPhotoThumbnailButton
                key={`${thumbnail.src}-${index}`}
                thumbnail={thumbnail}
                index={index}
                isCurrent={currentIndex === index}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReviewFields({
  defaultRating = 5,
  defaultBody = ""
}: {
  defaultRating?: number;
  defaultBody?: string;
}) {
  const [bodyValue, setBodyValue] = useState(defaultBody);

  return (
    <>
      <StarRatingInput defaultRating={defaultRating} />
      <label className="grid gap-1 text-sm font-semibold">
        <span className="flex items-center justify-between gap-2">
          <span>Review</span>
          <span className="text-xs font-semibold text-muted-foreground">Optional</span>
        </span>
        <textarea
          name="body"
          className="focus-ring h-40 resize-none overflow-y-auto rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm sm:h-44"
          maxLength={MAX_REVIEW_BODY_LENGTH}
          value={bodyValue}
          onChange={(event) => setBodyValue(event.currentTarget.value)}
          placeholder="Share what stood out: texture, fit, color, routine, delivery, or anything future buyers should know."
        />
        <span className="text-right text-xs font-semibold text-muted-foreground">
          {bodyValue.length}/{MAX_REVIEW_BODY_LENGTH}
        </span>
      </label>
      <PhotoUploadInput />
    </>
  );
}

function StarRatingInput({ defaultRating = 5 }: { defaultRating?: number }) {
  const [rating, setRating] = useState(defaultRating);
  const ratings = [1, 2, 3, 4, 5];

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentRating: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setRating(Math.min(5, currentRating + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setRating(Math.max(1, currentRating - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setRating(1);
    } else if (event.key === "End") {
      event.preventDefault();
      setRating(5);
    }
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">Rating</legend>
      <input type="hidden" name="rating" value={rating} />
      <div
        role="radiogroup"
        aria-label="Rating"
        className="inline-flex w-fit items-center gap-1"
      >
        {ratings.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            tabIndex={rating === value ? 0 : -1}
            onClick={() => setRating(value)}
            onKeyDown={(event) => handleKeyDown(event, value)}
            className={cn(
              "focus-ring flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-zinc-50",
              value <= rating ? "text-[#ffb703]" : "text-zinc-300"
            )}
          >
            <Star className={cn("h-7 w-7", value <= rating && "fill-current")} aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold text-muted-foreground">
        {rating} star{rating === 1 ? "" : "s"} selected
      </p>
    </fieldset>
  );
}

function PhotoUploadInput() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileLimitMessage, setFileLimitMessage] = useState("");
  const [previews, setPreviews] = useState<Array<{ name: string; size: string; url: string }>>([]);

  useEffect(() => {
    const nextPreviews = selectedFiles.map((file) => ({
      name: file.name,
      size: formatFileSize(file.size),
      url:
        typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(file)
          : ""
    }));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => {
        if (preview.url && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [selectedFiles]);

  function syncInputFiles(files: File[]) {
    if (fileInputRef.current) {
      if (files.length === 0) {
        fileInputRef.current.value = "";
        return;
      }

      if (typeof DataTransfer !== "undefined") {
        const transfer = new DataTransfer();
        files.forEach((file) => transfer.items.add(file));
        fileInputRef.current.files = transfer.files;
      }
    }
  }

  function setReviewPhotoFiles(files: File[]) {
    const limitedFiles = files.slice(0, MAX_REVIEW_PHOTOS);
    setFileLimitMessage(
      files.length > MAX_REVIEW_PHOTOS
        ? `Only the first ${MAX_REVIEW_PHOTOS} photos will be attached.`
        : ""
    );
    setSelectedFiles(limitedFiles);
    syncInputFiles(limitedFiles);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setReviewPhotoFiles(Array.from(event.currentTarget.files ?? []));
  }

  function clearFiles() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFiles([]);
    setFileLimitMessage("");
  }

  function removeFile(indexToRemove: number) {
    const nextFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(nextFiles);
    setFileLimitMessage("");
    syncInputFiles(nextFiles);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          Photos
          <span className="text-xs font-semibold text-muted-foreground">Optional</span>
        </label>
        {selectedFiles.length > 0 ? (
          <button type="button" onClick={clearFiles} className="text-xs font-black text-muted-foreground underline">
            Clear
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        name="photos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={handlePhotoChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="focus-ring grid gap-2 rounded-md border border-dashed border-zinc-300 bg-[#fff8f0] px-4 py-4 text-left transition hover:border-[#ff3d7f] hover:bg-white"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#ff3d7f]">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-black">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} selected`
                : "Add product photos"}
            </span>
            <span className="block text-sm font-semibold text-muted-foreground">
              JPG, PNG, or WebP. Up to {MAX_REVIEW_PHOTOS} photos.
            </span>
          </span>
        </span>
      </button>
      {fileLimitMessage ? (
        <p role="status" className="text-xs font-semibold text-muted-foreground">
          {fileLimitMessage}
        </p>
      ) : null}

      {previews.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {previews.map((preview, index) => (
            <div key={`${preview.name}-${preview.url}`} className="w-24 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white">
              <div className="relative">
              {preview.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-zinc-50">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="focus-ring absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white/95 text-foreground"
                  aria-label={`Remove ${preview.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid gap-0.5 p-2">
                <p className="truncate text-xs font-black">{preview.name}</p>
                <p className="text-xs font-semibold text-muted-foreground">{preview.size}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RatingStars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-[#ffb703]" aria-label={`${rating.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5", star <= rounded && "fill-current")}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatReviewerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Verified buyer";
  }

  const [first, ...rest] = trimmed.split(/\s+/);
  if (trimmed.includes("@")) {
    return first.split("@")[0] || "Verified buyer";
  }

  const lastInitial = rest.at(-1)?.[0];
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

function getDisplayReviewBody(body: string | undefined) {
  const trimmed = body?.trim() ?? "";
  if (!trimmed) {
    return "";
  }

  const readableCharacters = trimmed.replace(/[^A-Za-z0-9가-힣]/g, "");
  return readableCharacters.length > 0 ? trimmed : "";
}

function getReviewerInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "VB";
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
