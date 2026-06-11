import { AdminReviewsClient } from "@/components/admin-reviews-client";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listAdminProductReviews } from "@/lib/reviews-store";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  if (!(await requireAdminPageAccess("/admin/reviews"))) {
    return null;
  }

  const reviews = await listAdminProductReviews();

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">Review moderation</h2>
        <p className="text-sm text-muted-foreground">
          Hide, restore, or delete public reviews. Brand accounts can view reviews but cannot moderate them.
        </p>
      </div>
      <AdminReviewsClient reviews={reviews} />
    </div>
  );
}
