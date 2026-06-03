"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  Search,
  SlidersHorizontal,
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

type StatusFilter =
  | "all"
  | "active"
  | "tracking-ready"
  | "closed"
  | OrderStatus;
type SortOption = "newest" | "oldest" | "total-desc" | "status";
type QuickFilter = {
  value: StatusFilter;
  label: string;
  count: number;
};

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
  const quickFilters: QuickFilter[] = [
    { value: "all", label: "All", count: orders.length },
    { value: "active", label: "Active", count: activeCount },
    { value: "tracking-ready", label: "Tracking ready", count: trackingCount },
    { value: "closed", label: "Closed", count: closedCount },
  ];
  const exactStatusFilter = isSpecificStatusFilter(statusFilter)
    ? statusFilter
    : "";
  const hasActiveControls =
    Boolean(query.trim()) || statusFilter !== "all" || sortOption !== "newest";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setSortOption("newest");
  }

  return (
    <section className="account-page-shell bg-white">
      <div className="container py-6 sm:py-8">
        <div className="rounded-md border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to My Page
              </Link>
              <p className="mt-4 font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                Order management
              </p>
              <h1 className="mt-1 shipk-heading text-4xl sm:text-5xl">
                Orders
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
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

          <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
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

        <section
          aria-label="Order filters"
          className="sticky top-0 z-20 mt-5 rounded-md border border-zinc-200 bg-white/95 p-4 shadow-[0_8px_24px_rgba(24,24,27,0.06)] backdrop-blur"
        >
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto] xl:items-end">
            <div>
              <Label htmlFor="account-orders-search" className="font-semibold">
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
            <div className="grid gap-3 sm:grid-cols-[180px_180px_auto] sm:items-end">
              <div>
                <Label
                  htmlFor="account-orders-status"
                  className="font-semibold"
                >
                  Exact status
                </Label>
                <select
                  id="account-orders-status"
                  className="focus-ring mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold"
                  value={exactStatusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                        ? (event.target.value as OrderStatus)
                        : "all",
                    )
                  }
                >
                  <option value="">Any status</option>
                  {statusOptions.map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="account-orders-sort" className="font-semibold">
                  Sort
                </Label>
                <select
                  id="account-orders-sort"
                  aria-label="Sort orders"
                  className="focus-ring mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold"
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
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 pr-1 text-sm font-semibold text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              View
            </span>
            {quickFilters.map((filter) => (
              <QuickFilterButton
                key={filter.value}
                filter={filter}
                selected={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
              />
            ))}
          </div>

          <p
            role="status"
            className="mt-3 text-sm font-semibold text-muted-foreground"
          >
            Showing {displayedOrders.length} of {orders.length} orders
          </p>
        </section>

        {displayedOrders.length > 0 ? (
          <div
            role="table"
            aria-label="Orders list"
            className="mt-5 overflow-hidden rounded-md border border-zinc-200 bg-white"
            data-testid="orders-list"
          >
            <div
              role="row"
              className="hidden border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground md:grid md:grid-cols-[minmax(128px,0.9fr)_minmax(220px,1.45fr)_112px_116px_minmax(170px,1fr)_96px_104px] md:items-center md:gap-4"
            >
              <div role="columnheader">Order</div>
              <div role="columnheader">Product</div>
              <div role="columnheader">Placed</div>
              <div role="columnheader">Status</div>
              <div role="columnheader">Shipment</div>
              <div role="columnheader">Total</div>
              <div role="columnheader" className="text-right">
                Action
              </div>
            </div>
            <div role="rowgroup" className="divide-y divide-zinc-200">
              {displayedOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          </div>
        ) : (
          <section className="mt-5 rounded-md border border-dashed border-zinc-300 bg-white p-6">
            <p className="text-lg font-black">No orders match your filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Clear the search or choose a different status to see more orders.
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

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-base font-black">Need help with an order?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shipping timelines, carrier handoff, and delivery terms are kept
              in one place.
            </p>
          </div>
          <Link
            href="/policies/shipping"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-3 border-zinc-300 bg-white sm:mt-0",
            )}
          >
            Shipping policy
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
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
    <div className="bg-white p-4">
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

function QuickFilterButton({
  filter,
  selected,
  onClick,
}: {
  filter: QuickFilter;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${filter.label} ${filter.count}`}
      aria-pressed={selected}
      className={cn(
        "focus-ring inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold transition hover:border-zinc-500",
        selected
          ? "border-[#ff3d7f] text-[#d91b5c] ring-1 ring-[#ff3d7f]/20"
          : "border-zinc-300 text-foreground",
      )}
      onClick={onClick}
    >
      <span>{filter.label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-xs",
          selected ? "bg-[#ff3d7f] text-white" : "bg-zinc-100 text-zinc-600",
        )}
      >
        {filter.count}
      </span>
    </button>
  );
}

function OrderRow({ order }: { order: CommerceOrder }) {
  return (
    <article
      role="row"
      aria-label={`${order.orderNumber} ${order.productName}`}
      className="grid gap-3 px-4 py-4 transition hover:bg-zinc-50 md:grid-cols-[minmax(128px,0.9fr)_minmax(220px,1.45fr)_112px_116px_minmax(170px,1fr)_96px_104px] md:items-center md:gap-4 md:py-3"
    >
      <div role="cell" className="min-w-0">
        <MobileCellLabel>Order</MobileCellLabel>
        <p className="truncate font-black">{order.orderNumber}</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground md:hidden">
          {formatOrderDate(order.createdAt)}
        </p>
      </div>
      <div role="cell" className="min-w-0">
        <MobileCellLabel>Product</MobileCellLabel>
        <p className="truncate font-semibold">{order.productName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {order.optionName} · Qty {order.quantity}
        </p>
      </div>
      <div role="cell" className="text-sm font-semibold">
        <MobileCellLabel>Placed</MobileCellLabel>
        {formatOrderDate(order.createdAt)}
      </div>
      <div role="cell">
        <MobileCellLabel>Status</MobileCellLabel>
        <StatusBadge status={order.status} />
      </div>
      <div role="cell" className="min-w-0">
        <MobileCellLabel>Shipment</MobileCellLabel>
        <p className="truncate text-sm font-semibold">
          {getShipmentSummary(order)}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {order.trackingNumber ?? "Tracking pending"}
        </p>
      </div>
      <div role="cell" className="text-sm font-black">
        <MobileCellLabel>Total</MobileCellLabel>
        {formatUsd(order.totalCents)}
      </div>
      <div role="cell" className="md:flex md:justify-end">
        <Link
          href={`/account/orders/${order.id}`}
          aria-label="View details"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full whitespace-nowrap border-zinc-300 bg-white md:w-auto",
          )}
        >
          <span className="md:hidden">View details</span>
          <span className="hidden md:inline">Details</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function MobileCellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground md:hidden">
      {children}
    </span>
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
    const matchesStatus = matchesStatusFilter(order, statusFilter);
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

function matchesStatusFilter(order: CommerceOrder, statusFilter: StatusFilter) {
  if (statusFilter === "all") {
    return true;
  }
  if (statusFilter === "active") {
    return activeStatuses.has(order.status);
  }
  if (statusFilter === "tracking-ready") {
    return Boolean(order.shipmentCarrier && order.trackingNumber);
  }
  if (statusFilter === "closed") {
    return closedStatuses.has(order.status);
  }
  return order.status === statusFilter;
}

function isSpecificStatusFilter(
  statusFilter: StatusFilter,
): statusFilter is OrderStatus {
  return statusFilter in customerOrderStatusLabels;
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
