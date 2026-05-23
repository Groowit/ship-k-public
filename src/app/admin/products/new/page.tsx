import { AdminProductEditor } from "@/components/admin-product-form";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  if (!(await requireAdminPageAccess("/admin/products/new"))) {
    return null;
  }

  return <AdminProductEditor mode="create" />;
}
