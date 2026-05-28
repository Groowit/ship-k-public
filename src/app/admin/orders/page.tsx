import { AdminOrdersClient } from "@/components/admin-orders-client";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listOrders } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  if (!(await requireAdminPageAccess("/admin/orders"))) {
    return null;
  }

  return <AdminOrdersClient orders={await listOrders()} />;
}
