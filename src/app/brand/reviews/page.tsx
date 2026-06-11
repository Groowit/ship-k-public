import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCurrentAuthState } from "@/lib/auth";
import { listBrandMembershipsForUser } from "@/lib/brand-store";
import { listBrandReviewOverviewForUser } from "@/lib/reviews-store";

export const dynamic = "force-dynamic";

export default async function BrandReviewsPage() {
  const { user } = await getCurrentAuthState();

  if (!user) {
    return null;
  }

  const memberships = await listBrandMembershipsForUser(user.id);
  if (memberships.length === 0) {
    return (
      <section className="rounded-md border bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">403</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal">Brand member access required</h2>
        <p className="mt-3 text-muted-foreground">Review access is limited to brand members.</p>
      </section>
    );
  }

  const overviews = await listBrandReviewOverviewForUser(user.id);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">Product reviews</h2>
        <p className="text-sm text-muted-foreground">
          View public reviews for assigned products. Only administrators can hide or delete reviews.
        </p>
      </div>

      {overviews.length ? (
        overviews.map(({ product, brand, reviews, summary }) => (
          <section key={product.id} className="rounded-md border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{brand.name}</p>
                <h3 className="text-xl font-black">{product.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary.count
                    ? `${summary.averageRating.toFixed(1)} average · ${summary.count} reviews`
                    : "No reviews yet"}
                </p>
              </div>
              <Link
                href={`/products/${product.slug}#reviews`}
                className="rounded-md border bg-white px-3 py-2 text-sm font-semibold"
              >
                Public page
              </Link>
            </div>

            <div className="mt-4 grid gap-3">
              {reviews.length ? (
                reviews.map((review) => (
                  <article key={review.id} className="rounded-md border bg-[#fff8f0] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>
                        {review.rating} star{review.rating === 1 ? "" : "s"}
                      </Badge>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Helpful {review.helpfulCount}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-black">{review.authorName}</p>
                    {review.body ? <p className="mt-2 whitespace-pre-line text-sm leading-6">{review.body}</p> : null}
                  </article>
                ))
              ) : (
                <p className="rounded-md border bg-white p-4 text-sm text-muted-foreground">
                  No public reviews yet.
                </p>
              )}
            </div>
          </section>
        ))
      ) : (
        <p className="rounded-md border bg-white p-6 text-muted-foreground">
          No assigned products yet.
        </p>
      )}
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
