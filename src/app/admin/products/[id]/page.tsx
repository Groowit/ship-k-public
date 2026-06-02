import { notFound } from "next/navigation";
import { AdminProductEditor } from "@/components/admin-product-form";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { getProductBrandAssignmentForAdmin, listActiveBrandPartnerOptions } from "@/lib/brand-store";
import { getProductForAdmin } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await requireAdminPageAccess(`/admin/products/${id}`))) {
    return null;
  }

  const [product, brandOptions, currentAssignment] = await Promise.all([
    getProductForAdmin(id),
    listActiveBrandPartnerOptions(),
    getProductBrandAssignmentForAdmin(id)
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminProductEditor
      mode="edit"
      product={product}
      brandOptions={brandOptions}
      currentBrandAssignment={currentAssignment}
    />
  );
}
