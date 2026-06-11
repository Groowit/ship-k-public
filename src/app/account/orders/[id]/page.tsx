import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  MapPin,
  PackageCheck,
  Pencil,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";
import { OrderShippingProgress } from "@/components/order-shipping-progress";
import { OrderTrackingCard } from "@/components/order-tracking-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { formatUsd, type OrderStatus } from "@/lib/commerce";
import { getOrderByUser, getTrackingUrl } from "@/lib/commerce-store";
import { getCustomerOrderStatusLabel } from "@/lib/fulfillment";
import { getReviewEligibilityForProduct } from "@/lib/reviews-store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({
  params,
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

  const trackingUrl = getTrackingUrl(
    order.shipmentCarrier,
    order.trackingNumber,
  );
  const statusContent = getStatusContent(order.status);
  const trackingSummary = getTrackingSummary({
    carrier: order.shipmentCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl,
  });
  const reviewEligibility = order.productId
    ? await getReviewEligibilityForProduct({
        userId: user.id,
        productId: order.productId,
      })
    : undefined;
  const currentItemReview = order.orderItemId
    ? reviewEligibility?.items.find((item) => item.orderItemId === order.orderItemId)
    : undefined;

  return (
    <section className="account-page-shell bg-white">
      <div className="container py-7 sm:py-9">
        <nav
          aria-label="Order location"
          className="mb-5 flex flex-wrap items-center gap-2 text-sm"
        >
          <Link
            href="/account"
            className="font-semibold text-muted-foreground hover:text-foreground"
          >
            My Page
          </Link>
          <ChevronRight
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Link
            href="/account/orders"
            className="font-semibold text-muted-foreground hover:text-foreground"
          >
            Orders
          </Link>
          <ChevronRight
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-semibold">{order.orderNumber}</span>
        </nav>

        <div className="rounded-md border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                Order status
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="shipk-heading text-4xl sm:text-5xl">
                  {statusContent.headline}
                </h1>
                <Badge
                  className={cn(
                    "border bg-white font-semibold",
                    getStatusClass(order.status),
                  )}
                >
                  {getCustomerOrderStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {statusContent.copy}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm">
              <p className="font-brand-heavy text-xs uppercase text-muted-foreground">
                Order number
              </p>
              <p className="mt-1 text-lg font-black">{order.orderNumber}</p>
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  className={cn(buttonVariants(), "mt-4 w-full")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Track package
                </a>
              ) : (
                <p className="mt-3 text-muted-foreground">{trackingSummary}</p>
              )}
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
              label="Status"
              value={getCustomerOrderStatusLabel(order.status)}
            />
            <SummaryMetric
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="Ordered"
              value={formatOrderDate(order.createdAt)}
            />
            <SummaryMetric
              icon={<Truck className="h-4 w-4" aria-hidden="true" />}
              label="Tracking"
              value={trackingSummary}
            />
            <SummaryMetric
              icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
              label="Total"
              value={formatUsd(order.totalCents)}
            />
          </dl>
        </div>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <Card className="h-fit border-zinc-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <PackageCheck
                    className="h-5 w-5 text-[#ff3d7f]"
                    aria-hidden="true"
                  />
                  Delivery progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderShippingProgress status={order.status} />
              </CardContent>
            </Card>

            <Card className="h-fit border-zinc-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <Receipt
                    className="h-5 w-5 text-[#ff3d7f]"
                    aria-hidden="true"
                  />
                  Items in this order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm sm:grid-cols-4">
                  <DetailItem
                    label="Product"
                    value={order.productName}
                    className="sm:col-span-2"
                  />
                  <DetailItem label="Option" value={order.optionName} />
                  <DetailItem
                    label="Quantity"
                    value={order.quantity.toString()}
                  />
                </dl>
                {order.productSlug && currentItemReview ? (
                  <div className="mt-5 rounded-md border border-zinc-200 bg-[#fff8f0] p-4">
                    <p className="text-sm font-black">Review this item</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentItemReview.canReview
                        ? "Your payment is confirmed, so you can leave a verified review."
                        : currentItemReview.existingReviewId && !currentItemReview.existingReviewDeleted
                          ? "You already left a review for this purchase."
                          : "This purchase is not currently eligible for a new review."}
                    </p>
                    {currentItemReview.canReview ||
                    (currentItemReview.existingReviewId && !currentItemReview.existingReviewDeleted) ? (
                      <Link
                        href={`/products/${order.productSlug}#reviews`}
                        className={cn(buttonVariants({ size: "sm" }), "mt-3")}
                      >
                        <PencilIcon />
                        {currentItemReview.canReview ? "Write review" : "View review"}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <aside className="grid h-fit gap-4">
            <OrderTrackingCard
              status={order.status}
              carrier={order.shipmentCarrier}
              trackingNumber={order.trackingNumber}
              trackingUrl={trackingUrl}
              showAction={false}
            />

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-xl font-black">
                  Payment summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm">
                  <Row
                    label="Subtotal"
                    value={formatUsd(order.subtotalCents)}
                  />
                  <Row
                    label="Shipping"
                    value={formatUsd(order.shippingCents)}
                  />
                  <div className="mt-2 flex justify-between gap-4 border-t border-zinc-200 pt-3 text-base font-black">
                    <dt>Total</dt>
                    <dd>{formatUsd(order.totalCents)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <MapPin
                    className="h-5 w-5 text-[#ff3d7f]"
                    aria-hidden="true"
                  />
                  Shipping address
                </CardTitle>
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

            <Card className="border-zinc-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <HelpCircle
                    className="h-5 w-5 text-[#ff3d7f]"
                    aria-hidden="true"
                  />
                  Need help with this order?
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <p>
                  Use the order number above when asking about payment,
                  delivery, or address updates.
                </p>
                <Link
                  href="/policies/shipping"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Shipping policy
                </Link>
                <Link
                  href="/policies/returns"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Returns and refunds
                </Link>
                <Link
                  href="/account/orders"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Open order history
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PencilIcon() {
  return (
    <Pencil className="h-4 w-4" aria-hidden="true" />
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <dt className="flex items-start justify-between gap-3 text-xs font-semibold uppercase text-muted-foreground">
        <span>{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-foreground">
          {icon}
        </span>
      </dt>
      <dd className="mt-2 break-words font-black">{value}</dd>
    </div>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function getStatusContent(status: OrderStatus) {
  const content: Record<OrderStatus, { headline: string; copy: string }> = {
    pending_payment: {
      headline: "Payment pending",
      copy: "We are waiting for payment confirmation before preparing this order.",
    },
    paid: {
      headline: "Order confirmed",
      copy: "Your payment is confirmed. We will start preparing the package soon.",
    },
    preparing: {
      headline: "Preparing your order",
      copy: "Your items are being checked and packed before handoff to the carrier.",
    },
    shipped: {
      headline: "Package on the way",
      copy: "Your package has left preparation and carrier tracking is available below.",
    },
    delivered: {
      headline: "Delivered",
      copy: "This order is marked delivered. Review the address and payment summary below.",
    },
    cancelled: {
      headline: "Order cancelled",
      copy: "This order is closed and will not move through delivery progress.",
    },
    refunded: {
      headline: "Refund completed",
      copy: "This order is closed after refund follow-up. Delivery progress is no longer active.",
    },
  };

  return content[status];
}

function getTrackingSummary({
  carrier,
  trackingNumber,
  trackingUrl,
}: {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string;
}) {
  if (trackingUrl) {
    return "Tracking is ready";
  }
  if (carrier && trackingNumber) {
    return `${carrier} tracking number ready`;
  }
  return "Tracking will appear after your order ships.";
}

function getStatusClass(status: OrderStatus) {
  if (status === "shipped" || status === "delivered") {
    return "border-emerald-200 text-emerald-700";
  }
  if (status === "pending_payment") {
    return "border-amber-200 text-amber-700";
  }
  if (status === "cancelled" || status === "refunded") {
    return "border-zinc-200 text-muted-foreground";
  }
  return "border-zinc-200 text-foreground";
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
