import { AdminAffiliatesClient } from "@/components/admin-affiliates-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listAdminAffiliates } from "@/lib/mvp-store";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  if (!(await requireAdminPageAccess("/admin/affiliates"))) {
    return null;
  }

  const affiliates = await listAdminAffiliates();

  return (
    <Card>
      <CardHeader>
        <CardTitle>홍보자</CardTitle>
      </CardHeader>
      <CardContent>
        <AdminAffiliatesClient affiliates={affiliates} />
      </CardContent>
    </Card>
  );
}
