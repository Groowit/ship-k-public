import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listCommissions, listOrders, listProducts } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  if (!(await requireAdminPageAccess("/admin"))) {
    return null;
  }

  const [products, orders, commissions] = await Promise.all([
    listProducts(),
    listOrders(),
    listCommissions()
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Metric title="상품 수" value={products.length.toString()} />
      <Metric title="주문 수" value={orders.length.toString()} />
      <Metric title="대기 중 커미션" value={commissions.length.toString()} />
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
