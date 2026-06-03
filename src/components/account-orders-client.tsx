"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatUsd, type OrderStatus } from "@/lib/commerce";
import type { CommerceOrder } from "@/lib/commerce-store";
import {
  customerOrderStatusLabels,
  getCustomerOrderStatusLabel,
} from "@/lib/fulfillment";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | OrderStatus;
type SortOption = "newest" | "oldest" | "total-desc" | "status";

const activeStatuses = new Set<OrderStatus>([
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
]);
const closedStatuses = new Set<OrderStatus>([
  "delivered",
  "cancelled",
  "refunded",
]);
const statusOptions = Object.entries(customerOrderStatusLabels) as Array<
  [OrderStatus, string]
>;
const statusPriority: Record<OrderStatus, number> = {
  pending_payment: 0,
  paid: 1,
  preparing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
  refunded: 6,
};

export function AccountOrdersClient({ orders }: { orders: CommerceOrder[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const filteredOrders = useMemo(
    () => filterOrders(orders, { query, statusFilter }),
    [orders, query, statusFilter],
  );
  const displayedOrders = useMemo(
    () => sortOrders(filteredOrders, sortOption),
    [filteredOrders, sortOption],
  );

  const activeCount = orders.filter((order) =>
    activeStatuses.has(order.status),
  ).length;
  const trackingCount = orders.filter((order) =>
    Boolean(order.shipmentCarrier && order.trackingNumber),
  ).length;
  const closedCount = orders.filter((order) =>
    closedStatuses.has(order.status),
  ).length;
  const hasActiveControls =
    Boolean(query.trim()) || statusFilter !== "all" || sortOption !== "newest";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setSortOption("newest");
  }

  return (
    <section className="account-page-shell bg-white">
      <div className="container py-7 sm:py-9">
        <div className="rounded-md border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to My Page
              </Link>
              <p className="mt-5 font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                Order management
              </p>
              <h1 className="mt-2 shipk-heading text-4xl sm:text-5xl">
                Orders
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Search your purchases, check current delivery status, and open
                the detail page for tracking, payment, and shipping information.
              </p>
            </div>
            <Link
              href="/shop"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-zinc-300 bg-white",
              )}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Shop again
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
              label="Total orders"
              value={formatOrderCount(orders.length)}
              caption="All checkout records"
            />
            <Metric
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label="Active"
              value={activeCount.toString()}
              caption="Payment, prep, or delivery"
            />
            <Metric
              icon={<Truck className="h-4 w-4" aria-hidden="true" />}
              label="Tracking"
              value={trackingCount.toString()}
              caption="Carrier details ready"
            />
            <Metric
              icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
              label="Closed"
              value={closedCount.toString()}
              caption="Delivered, cancelled, or refunded"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4">
            <section
              aria-label="Order filters"
              className="rounded-md border border-zinc-200 bg-white p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
                <div>
                  <Label
                    htmlFor="account-orders-search"
                    className="font-semibold"
                  >
                    Search orders
                  </Label>
                  <div className="relative mt-2">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="account-orders-search"
                      className="pl-9"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Order number, product, tracking"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="account-orders-status"
                    className="font-semibold"
                  >
                    Status
                  </Label>
                  <select
                    id="account-orders-status"
                    className="focus-ring mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm font-semibold"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                  >
                    <option value="all">All statuses</option>
                    {statusOptions.map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label
                    htmlFor="account-orders-sort"
                    className="font-semibold"
                  >
                    Sort
                  </Label>
                  <select
                    id="account-orders-sort"
                    aria-label="Sort orders"
                    className="focus-ring mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm font-semibold"
                    value={sortOption}
                    onChange={(event) =>
                      setSortOption(event.target.value as SortOption)
                    }
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="total-desc">Highest total</option>
                    <option value="status">Status stage</option>
                  </select>
                </div>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "border-zinc-300 bg-white",
                    !hasActiveControls && "opacity-60",
                  )}
                  onClick={resetFilters}
                  disabled={!hasActiveControls}
                >
                  Reset filters
                </button>
              </div>
              <p
                role="status"
                className="mt-4 text-sm font-semibold text-muted-foreground"
              >
                Showing {displayedOrders.length} of {orders.length} orders
              </p>
            </section>

            {displayedOrders.length > 0 ? (
              <div className="grid gap-3" data-testid="orders-list">
                {displayedOrders.map((order) => (
                  <article
                    key={order.id}
                    aria-label={`${order.orderNumber} ${order.productName}`}
                    className="rounded-md border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black">
                            {order.orderNumber}
                          </h2>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-2 font-semibold">
                          {order.productName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.optionName} · Qty {order.quantity}
                        </p>
                      </div>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "border-zinc-300 bg-white",
                        )}
                      >
                        View details
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                      <RecordDetail
                        label="Ordered"
                        value={formatOrderDate(order.createdAt)}
                      />
                      <RecordDetail
                        label="Total"
                        value={formatUsd(order.totalCents)}
                      />
                      <RecordDetail
                        label="Shipment"
                        value={getShipmentSummary(order)}
                      />
                      <RecordDetail
                        label="Tracking"
                        value={order.trackingNumber ?? "Tracking pending"}
                      />
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <section className="rounded-md border border-dashed border-zinc-300 bg-white p-6">
                <p className="text-lg font-black">
                  No orders match your filters.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clear the search or choose a different status to see more
                  orders.
                </p>
                <button
                  type="button"
                  className={cn(buttonVariants(), "mt-4")}
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              </section>
            )}
          </div>

          <aside className="grid h-fit gap-4">
            <section className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-black">Status guide</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <GuideItem
                  label="Preparing"
                  value="We are packing your order."
                />
                <GuideItem
                  label="Shipped"
                  value="Carrier details are available when added."
                />
                <GuideItem
                  label="Delivered"
                  value="The order has reached the address on file."
                />
                <GuideItem
                  label="Refunded"
                  value="Payment follow-up is complete."
                />
              </dl>
            </section>
            <section className="rounded-md border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-black">Order help</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a detail page for tracking, payment summary, shipping
                address, and support links tied to that order.
              </p>
              <Link
                href="/policies/shipping"
                className="mt-4 inline-flex text-sm font-semibold underline-offset-4 hover:underline"
              >
                Review shipping policy
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-foreground">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function RecordDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function GuideItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black">{label}</dt>
      <dd className="mt-1 text-muted-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      className={cn("border bg-white font-semibold", getStatusClass(status))}
    >
      {getCustomerOrderStatusLabel(status)}
    </Badge>
  );
}

function filterOrders(
  orders: CommerceOrder[],
  { query, statusFilter }: { query: string; statusFilter: StatusFilter },
) {
  const normalizedQuery = query.trim().toLowerCase();

  return orders.filter((order) => {
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    if (!matchesStatus) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const searchable = [
      order.orderNumber,
      order.productName,
      order.optionName,
      order.status,
      getCustomerOrderStatusLabel(order.status),
      order.shipmentCarrier,
      order.trackingNumber,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

function sortOrders(orders: CommerceOrder[], sortOption: SortOption) {
  return [...orders].sort((left, right) => {
    if (sortOption === "oldest") {
      return compareDates(left.createdAt, right.createdAt);
    }
    if (sortOption === "total-desc") {
      return right.totalCents - left.totalCents;
    }
    if (sortOption === "status") {
      return statusPriority[left.status] - statusPriority[right.status];
    }
    return compareDates(right.createdAt, left.createdAt);
  });
}

function compareDates(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function getShipmentSummary(order: CommerceOrder) {
  if (order.shipmentCarrier && order.trackingNumber) {
    return `${order.shipmentCarrier} ready`;
  }
  if (order.status === "delivered") {
    return "Delivered";
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    return "Closed";
  }
  return "Not shipped yet";
}

function getStatusClass(status: OrderStatus) {
  if (status === "shipped" || status === "delivered") {
    return "border-emerald-200 text-emerald-700";
  }
  if (status === "cancelled" || status === "refunded") {
    return "border-zinc-200 text-muted-foreground";
  }
  if (status === "pending_payment") {
    return "border-amber-200 text-amber-700";
  }
  return "border-zinc-200 text-foreground";
}

function formatOrderCount(count: number) {
  return `${count} order${count === 1 ? "" : "s"}`;
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
