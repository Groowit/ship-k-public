import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { getCurrentAuthState } from "@/lib/auth";
import { findProductBySlug } from "@/lib/mvp-store";

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

  return <ProductDetailView product={product} isAuthenticated={Boolean(user)} />;
}
