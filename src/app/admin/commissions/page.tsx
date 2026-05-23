import { AdminCommissionsClient } from "@/components/admin-commissions-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listCommissions, listOrders } from "@/lib/mvp-store";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  if (!(await requireAdminPageAccess("/admin/commissions"))) {
    return null;
  }

  const [commissions, orders] = await Promise.all([listCommissions(), listOrders()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>추천 커미션</CardTitle>
      </CardHeader>
      <CardContent>
        <AdminCommissionsClient commissions={commissions} orders={orders} />
      </CardContent>
    </Card>
  );
}
