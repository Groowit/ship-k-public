import { AdminBrandManagementClient } from "@/components/admin-brand-management-client";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listAdminBrands } from "@/lib/brand-store";
import { listProducts } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  if (!(await requireAdminPageAccess("/admin/brands"))) {
    return null;
  }

  const [brands, products] = await Promise.all([listAdminBrands(), listProducts()]);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">브랜드 상품 관리</h2>
        <p className="text-sm text-muted-foreground">
          브랜드를 만들고, 기존 고객 계정을 멤버로 연결한 뒤, 운영자가 등록한 상품을 브랜드에 배정합니다.
        </p>
      </div>
      <AdminBrandManagementClient brands={brands} products={products} />
    </div>
  );
}
