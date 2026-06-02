import { AdminProductEditor } from "@/components/admin-product-form";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listActiveBrandPartnerOptions } from "@/lib/brand-store";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  if (!(await requireAdminPageAccess("/admin/products/new"))) {
    return null;
  }

  const brandOptions = await listActiveBrandPartnerOptions();

  return <AdminProductEditor mode="create" brandOptions={brandOptions} />;
}
