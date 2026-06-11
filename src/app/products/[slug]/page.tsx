import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { getCurrentAuthState } from "@/lib/auth";
import { findProductBySlug } from "@/lib/commerce-store";
import { getReviewEligibilityForProduct, listProductReviews } from "@/lib/reviews-store";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await findProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const { user } = await getCurrentAuthState();
  const [reviewsPayload, reviewEligibility] = await Promise.all([
    listProductReviews({
      productId: product.id,
      sort: "popular",
      viewerId: user?.id
    }),
    user
      ? getReviewEligibilityForProduct({
          userId: user.id,
          productId: product.id
        })
      : Promise.resolve(undefined)
  ]);

  return (
    <ProductDetailView
      product={product}
      isAuthenticated={Boolean(user)}
      viewerId={user?.id}
      reviewsPayload={reviewsPayload}
      reviewEligibility={reviewEligibility}
    />
  );
}
