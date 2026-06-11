/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import type { ProductReview } from "@/lib/reviews-store";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "visible" | "hidden" | "deleted";

export function AdminReviewsClient({ reviews }: { reviews: ProductReview[] }) {
  const [rows, setRows] = useState(reviews);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const displayedRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((review) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "deleted"
          ? Boolean(review.deletedAt)
          : !review.deletedAt && review.status === statusFilter);
      const matchesQuery =
        !normalizedQuery ||
        [
          review.productName,
          review.productSlug,
          review.orderNumber,
          review.authorName,
          review.body
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [query, rows, statusFilter]);

  async function moderate(reviewId: string, hidden: boolean) {
    setBusyId(reviewId);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden })
      });
      const payload = (await response.json()) as { review?: ProductReview; error?: string };
      if (!response.ok || !payload.review) {
        throw new Error(payload.error ?? "Could not update review status.");
      }
      setRows((current) => current.map((row) => (row.id === reviewId ? payload.review! : row)));
      setMessage(hidden ? "Review hidden." : "Review restored.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update review status.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteReview(reviewId: string) {
    setBusyId(reviewId);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not delete review.");
      }
      setRows((current) =>
        current.map((row) =>
          row.id === reviewId
            ? { ...row, deletedAt: new Date().toISOString(), helpfulCount: 0 }
            : row
        )
      );
      setMessage("Review deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete review.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-md border-2 border-black bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_180px]">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">Search</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Product, order, author, or review text"
                aria-label="Search reviews"
              />
            </span>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="focus-ring h-11 rounded-md border bg-white px-3 text-sm font-semibold"
              aria-label="Review status filter"
            >
              <option value="all">All</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
              <option value="deleted">Deleted</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {displayedRows.length} / {rows.length} reviews
        </p>
      </div>

      {message ? <p className="rounded-md border bg-white p-3 text-sm font-semibold">{message}</p> : null}

      <div className="grid gap-3">
        {displayedRows.length ? (
          displayedRows.map((review) => (
            <article key={review.id} className="rounded-md border-2 border-black bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn(review.deletedAt ? "bg-zinc-100 text-muted-foreground" : review.status === "hidden" ? "bg-amber-100 text-amber-800" : "bg-[#d9f99d] text-foreground")}>
                      {review.deletedAt ? "Deleted" : review.status === "hidden" ? "Hidden" : "Visible"}
                    </Badge>
                    <span className="font-black">
                      {review.rating} star{review.rating === 1 ? "" : "s"}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Helpful {review.helpfulCount}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black">{review.productName ?? review.productId}</h2>
                  <p className="text-sm text-muted-foreground">
                    {review.orderNumber ?? review.orderId} · {review.authorName} · {formatDate(review.createdAt)}
                  </p>
                  {review.body ? <p className="mt-3 whitespace-pre-line text-sm leading-6">{review.body}</p> : null}
                  {review.images.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.images.slice(0, 4).map((image) => (
                        <img
                          key={image.id}
                          src={image.publicUrl || image.imagePath}
                          alt="Review attachment"
                          className="h-16 w-16 rounded-md border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  {!review.deletedAt ? (
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => moderate(review.id, review.status !== "hidden")}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {review.status === "hidden" ? (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      )}
                      {review.status === "hidden" ? "Show" : "Hide"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === review.id || Boolean(review.deletedAt)}
                    onClick={() => deleteReview(review.id)}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-md border bg-white p-6 text-muted-foreground">No reviews match these filters.</p>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
