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
        <h2 className="text-2xl font-bold tracking-normal">브랜드 파트너 관리</h2>
        <p className="text-sm text-muted-foreground">
          브랜드 파트너를 만들고 멤버 권한을 관리합니다. 상품 연결은 상품 등록/수정 화면에서 먼저 설정하고,
          이곳에서는 배정 상태를 감사하거나 이관합니다.
        </p>
      </div>
      <AdminBrandManagementClient brands={brands} products={products} />
    </div>
  );
}
