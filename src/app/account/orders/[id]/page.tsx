import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { OrderShippingProgress } from "@/components/order-shipping-progress";
import { OrderTrackingCard } from "@/components/order-tracking-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { formatUsd } from "@/lib/commerce";
import { getCustomerOrderStatusLabel } from "@/lib/fulfillment";
import { getOrderByUser, getTrackingUrl } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath(`/account/orders/${id}`));
  }

  const order = await getOrderByUser({ orderId: id, userId: user.id });

  if (!order) {
    notFound();
  }

  const trackingUrl = getTrackingUrl(order.shipmentCarrier, order.trackingNumber);

  return (
    <section className="container py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
            My shipK
          </p>
          <h1 className="mt-2 shipk-heading text-5xl">{order.orderNumber}</h1>
          <p className="mt-3 text-muted-foreground">
            {formatOrderDate(order.createdAt)} · {getCustomerOrderStatusLabel(order.status)}
          </p>
        </div>
        <Link
          href="/account/orders"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-full border-2 border-black font-black shadow-none"
          )}
        >
          All orders
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="rounded-md border-2 border-black shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading flex items-center gap-2 text-2xl">
                <PackageCheck className="h-5 w-5" aria-hidden="true" />
                Shipping progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderShippingProgress status={order.status} />
            </CardContent>
          </Card>

          <Card className="rounded-md border-2 border-black shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading text-2xl">Order item</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
              <p className="sm:col-span-2">
                <span className="block text-muted-foreground">Product</span>
                {order.productName}
              </p>
              <p>
                <span className="block text-muted-foreground">Option</span>
                {order.optionName}
              </p>
              <p>
                <span className="block text-muted-foreground">Quantity</span>
                {order.quantity}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="grid h-fit gap-4">
          <OrderTrackingCard
            status={order.status}
            carrier={order.shipmentCarrier}
            trackingNumber={order.trackingNumber}
            trackingUrl={trackingUrl}
          />

          <Card className="rounded-md border-2 border-black shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading text-2xl">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <Row label="Subtotal" value={formatUsd(order.subtotalCents)} />
                <Row label="Shipping" value={formatUsd(order.shippingCents)} />
                <div className="mt-2 flex justify-between border-t-2 border-black pt-3 text-base font-black">
                  <dt>Total</dt>
                  <dd>{formatUsd(order.totalCents)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="rounded-md border-2 border-black shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading text-2xl">Ship to</CardTitle>
            </CardHeader>
            <CardContent>
              <address className="grid gap-1 text-sm not-italic text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {order.shippingAddress.name}
                </span>
                <span>{order.shippingAddress.address1}</span>
                {order.shippingAddress.address2 ? (
                  <span>{order.shippingAddress.address2}</span>
                ) : null}
                <span>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.postalCode}
                </span>
                <span>{order.shippingAddress.phone}</span>
              </address>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
