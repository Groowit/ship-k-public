import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/product-detail-view";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { getProductForAdmin } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AdminProductPreviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await requireAdminPageAccess(`/admin/products/${id}/preview`))) {
    return null;
  }

  const product = await getProductForAdmin(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4">
        <div>
          <p className="text-sm font-semibold uppercase text-muted-foreground">임시저장 미리보기</p>
          <h2 className="text-2xl font-bold tracking-normal">{product.name}</h2>
          <p className="text-sm text-muted-foreground">상태: {getStatusLabel(product.status)}</p>
        </div>
        <Link href={`/admin/products/${product.id}`} className={buttonVariants({ variant: "outline" })}>
          편집기로 돌아가기
        </Link>
      </div>
      <div className="overflow-hidden rounded-md border bg-background">
        <ProductDetailView product={product} isAuthenticated previewMode />
      </div>
    </div>
  );
}

function getStatusLabel(status: string) {
  if (status === "active") {
    return "판매중";
  }

  if (status === "archived") {
    return "보관됨";
  }

  return "임시저장";
}
