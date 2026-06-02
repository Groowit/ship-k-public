import { AdminCommissionsClient } from "@/components/admin-commissions-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listAdminCommissionSettlements } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  if (!(await requireAdminPageAccess("/admin/commissions"))) {
    return null;
  }

  const settlements = await listAdminCommissionSettlements();

  return (
    <Card>
      <CardHeader>
        <CardTitle>홍보자 정산</CardTitle>
      </CardHeader>
      <CardContent>
        <AdminCommissionsClient settlements={settlements} />
      </CardContent>
    </Card>
  );
}
