import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { formatUsd } from "@/lib/commerce";
import { listOrdersByUser } from "@/lib/mvp-store";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const { user } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/account/orders"));
  }

  const orders = await listOrdersByUser(user.id);

  return (
    <section className="container py-10">
      <div className="mb-8">
        <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">My shipK</p>
        <h1 className="mt-2 shipk-heading text-5xl">Orders</h1>
        <p className="mt-3 text-muted-foreground">
          Your recent checkout records from the shipK database appear here.
        </p>
      </div>
      {orders.length === 0 ? (
        <Card className="rounded-md border-2 border-black shadow-none">
          <CardContent className="pt-5">
            <p className="text-muted-foreground">No orders yet.</p>
            <Link href="/shop" className="shipk-chip mt-4 inline-flex bg-[#c8f26c]">
              Shop sets
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="rounded-md border-2 border-black shadow-none">
              <CardHeader>
                <CardTitle className="shipk-heading text-2xl">{order.orderNumber}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
                <p>
                  <span className="block text-muted-foreground">Product</span>
                  {order.productName}
                </p>
                <p>
                  <span className="block text-muted-foreground">Status</span>
                  {order.status}
                </p>
                <p>
                  <span className="block text-muted-foreground">Total</span>
                  {formatUsd(order.totalCents)}
                </p>
                <p>
                  <span className="block text-muted-foreground">Tracking</span>
                  {order.trackingNumber ?? "Pending"}
                </p>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="shipk-chip mt-2 inline-flex bg-[#fff8f0] sm:col-span-4 sm:w-fit"
                >
                  View details
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
