import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { buttonVariants } from "@/components/ui/button-variants";
import { getCurrentAuthState } from "@/lib/auth";
import {
  BrandAccessDeniedError,
  BrandProductNotFoundError,
  getBrandProductForUser
} from "@/lib/brand-store";

export const dynamic = "force-dynamic";

export default async function BrandProductPreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getCurrentAuthState();
  const { id } = await params;

  if (!user) {
    return null;
  }

  try {
    const { product } = await getBrandProductForUser({ userId: user.id, productId: id });
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">브랜드 미리보기</p>
            <h2 className="text-2xl font-bold tracking-normal">{product.name}</h2>
            <p className="text-sm text-muted-foreground">고객-facing 상품 상세 화면 기준입니다.</p>
          </div>
          <Link href={`/brand/products/${product.id}`} className={buttonVariants({ variant: "outline" })}>
            편집기로 돌아가기
          </Link>
        </div>
        <div className="overflow-hidden rounded-md border bg-background">
          <ProductDetailView product={product} isAuthenticated previewMode />
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof BrandProductNotFoundError) {
      notFound();
    }

    if (error instanceof BrandAccessDeniedError) {
      return (
        <section className="rounded-md border bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">403</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal">브랜드 멤버 권한이 필요합니다</h2>
          <p className="mt-3 text-muted-foreground">이 상품을 볼 수 있는 브랜드 배정이 없습니다.</p>
        </section>
      );
    }

    throw error;
  }
}
