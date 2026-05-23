"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminFulfillmentStatusLabels,
  adminFulfillmentStatuses,
  fulfillmentCarriers
} from "@/lib/fulfillment";
import type { MvpOrder } from "@/lib/mvp-store";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | (typeof adminFulfillmentStatuses)[number];
type CarrierFilter = "all" | "none" | (typeof fulfillmentCarriers)[number];

export function AdminOrdersClient({ orders }: { orders: MvpOrder[] }) {
  const [rows, setRows] = useState(orders);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [carrierFilter, setCarrierFilter] = useState<CarrierFilter>("all");
  const [errorByOrderId, setErrorByOrderId] = useState<Record<string, string>>({});

  const filteredRows = useMemo(
    () => filterOrders(rows, { query, statusFilter, carrierFilter }),
    [rows, query, statusFilter, carrierFilter]
  );
  const selectedOrder =
    filteredRows.find((order) => order.id === selectedOrderId) ?? filteredRows[0] ?? null;

  async function updateShipment(orderId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitShipment(orderId, event.currentTarget);
  }

  async function submitShipment(orderId: string, form: HTMLFormElement) {
    const formData = new FormData(form);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: formData.get("status"),
        carrier: formData.get("carrier") || undefined,
        trackingNumber: formData.get("trackingNumber")
      })
    });
    const payload = await response.json();
    if (response.ok) {
      setErrorByOrderId((current) => ({ ...current, [orderId]: "" }));
      setRows((current) =>
        current.map((row) => (row.id === orderId ? payload.order : row))
      );
      setSelectedOrderId(orderId);
    } else {
      setErrorByOrderId((current) => ({
        ...current,
        [orderId]: payload.error ?? "배송 정보를 저장하지 못했습니다."
      }));
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border bg-white p-5 text-muted-foreground">
        아직 주문이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-md border-2 border-black bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">
              Search
            </span>
            <span className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="주문번호, 고객, 상품, 운송장"
                aria-label="Search orders"
              />
            </span>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="focus-ring h-11 rounded-md border bg-white px-3 text-sm font-semibold"
              aria-label="Status filter"
            >
              <option value="all">전체 상태</option>
              {adminFulfillmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {adminFulfillmentStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">
              Carrier
            </span>
            <select
              value={carrierFilter}
              onChange={(event) => setCarrierFilter(event.target.value as CarrierFilter)}
              className="focus-ring h-11 rounded-md border bg-white px-3 text-sm font-semibold"
              aria-label="Carrier filter"
            >
              <option value="all">전체 배송사</option>
              <option value="none">배송사 없음</option>
              {fulfillmentCarriers.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {filteredRows.length} / {rows.length} orders
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid auto-rows-fr gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredRows.length ? (
            filteredRows.map((order) => (
              <button
                key={order.id}
                type="button"
                data-testid={`admin-order-${order.id}`}
                aria-pressed={selectedOrder?.id === order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={cn(
                  "focus-ring grid min-h-[13.5rem] gap-4 rounded-md border-2 border-black bg-white p-4 text-left transition hover:bg-[#fff8f0]",
                  selectedOrder?.id === order.id ? "bg-[#c8f26c]" : ""
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-brand-heavy text-xl leading-tight">
                      {order.orderNumber}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-muted-foreground">
                      {formatOrderDate(order.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={order.status} />
                </span>

                <span className="grid gap-2 text-sm">
                  <span>
                    <span className="block text-muted-foreground">Customer</span>
                    <span className="break-all font-semibold">
                      {order.shippingAddress.email}
                    </span>
                  </span>
                  <span>
                    <span className="block text-muted-foreground">Ship to</span>
                    <span className="font-semibold">
                      {order.shippingAddress.name || "No recipient"}
                    </span>
                  </span>
                </span>

                <span className="mt-auto grid gap-1 border-t pt-3 text-sm">
                  <span className="font-semibold">{order.productName}</span>
                  <span className="flex items-center justify-between gap-3 text-muted-foreground">
                    <span>{formatShipmentSummary(order)}</span>
                    <span className="font-black text-foreground">
                      ${(order.totalCents / 100).toFixed(2)}
                    </span>
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-md border-2 border-black bg-white p-5 text-muted-foreground md:col-span-2 2xl:col-span-3">
              조건에 맞는 주문이 없습니다.
            </div>
          )}
        </div>

        <aside className="h-fit rounded-md border-2 border-black bg-white p-5 xl:sticky xl:top-5">
          {selectedOrder ? (
            <OrderEditor
              key={`${selectedOrder.id}-${selectedOrder.status}-${selectedOrder.shipmentCarrier ?? ""}-${selectedOrder.trackingNumber ?? ""}`}
              order={selectedOrder}
              error={errorByOrderId[selectedOrder.id]}
              onSubmit={updateShipment}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              주문을 선택하면 배송 정보를 수정할 수 있습니다.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function OrderEditor({
  order,
  error,
  onSubmit
}: {
  order: MvpOrder;
  error?: string;
  onSubmit: (orderId: string, event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={(event) => onSubmit(order.id, event)}
      data-testid={`fulfillment-form-${order.id}`}
      className="grid gap-4"
    >
      <div>
        <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
          Fulfillment
        </p>
        <h2 className="mt-1 shipk-heading text-3xl">{order.orderNumber}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.shippingAddress.email}
        </p>
      </div>

      <div className="grid gap-3 rounded-md border-2 border-black bg-[#fff8f0] p-4 text-sm">
        <p>
          <span className="block text-muted-foreground">Product</span>
          <span className="font-semibold">{order.productName}</span>
        </p>
        <p>
          <span className="block text-muted-foreground">Recipient</span>
          <span className="font-semibold">
            {order.shippingAddress.name || "No recipient"}
          </span>
        </p>
        <p>
          <span className="block text-muted-foreground">Total</span>
          <span className="font-black">${(order.totalCents / 100).toFixed(2)}</span>
        </p>
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-muted-foreground">Status</span>
        <select
          name="status"
          defaultValue={getAdminEditableStatus(order.status)}
          className="focus-ring h-11 rounded-md border bg-white px-3 text-sm font-semibold"
        >
          {adminFulfillmentStatuses.map((status) => (
            <option key={status} value={status}>
              {adminFulfillmentStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-muted-foreground">Carrier</span>
        <select
          name="carrier"
          defaultValue={order.shipmentCarrier ?? ""}
          className="focus-ring h-11 rounded-md border bg-white px-3 text-sm font-semibold"
        >
          <option value="">배송사 선택</option>
          {fulfillmentCarriers.map((carrier) => (
            <option key={carrier} value={carrier}>
              {carrier}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-muted-foreground">
          Tracking number
        </span>
        <Input
          name="trackingNumber"
          placeholder="운송장 번호"
          defaultValue={order.trackingNumber ?? ""}
        />
      </label>
      <Button type="submit" data-testid={`update-order-${order.id}`}>
        배송 정보 저장
      </Button>
      {error ? (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      ) : null}
    </form>
  );
}

function filterOrders(
  orders: MvpOrder[],
  {
    query,
    statusFilter,
    carrierFilter
  }: {
    query: string;
    statusFilter: StatusFilter;
    carrierFilter: CarrierFilter;
  }
) {
  const normalizedQuery = query.trim().toLowerCase();

  return orders.filter((order) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        order.orderNumber,
        order.productName,
        order.optionName,
        order.shippingAddress.name,
        order.shippingAddress.email,
        order.shippingAddress.phone,
        order.trackingNumber ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesStatus =
      statusFilter === "all" || getAdminEditableStatus(order.status) === statusFilter;
    const matchesCarrier =
      carrierFilter === "all" ||
      (carrierFilter === "none"
        ? !order.shipmentCarrier
        : order.shipmentCarrier === carrierFilter);

    return matchesQuery && matchesStatus && matchesCarrier;
  });
}

function StatusBadge({ status }: { status: MvpOrder["status"] }) {
  return (
    <Badge className={cn("shrink-0 border-2 border-black font-black", getStatusClass(status))}>
      {getOrderStatusLabel(status)}
    </Badge>
  );
}

function getStatusClass(status: MvpOrder["status"]) {
  if (status === "shipped" || status === "delivered") {
    return "bg-[#c8f26c]";
  }

  if (status === "preparing") {
    return "bg-[#ffe25a]";
  }

  if (status === "refunded" || status === "cancelled") {
    return "bg-[#ffd6e3]";
  }

  return "bg-white";
}

function formatShipmentSummary(order: MvpOrder) {
  if (order.shipmentCarrier && order.trackingNumber) {
    return `${order.shipmentCarrier} · ${order.trackingNumber}`;
  }

  if (order.shipmentCarrier) {
    return order.shipmentCarrier;
  }

  return "배송 정보 없음";
}

function getOrderStatusLabel(status: MvpOrder["status"]) {
  const labels: Record<MvpOrder["status"], string> = {
    pending_payment: "결제 대기",
    paid: "결제 완료",
    preparing: "준비 중",
    shipped: "배송 중",
    delivered: "배송 완료",
    cancelled: "취소됨",
    refunded: "환불 완료"
  };

  return labels[status];
}

function getAdminEditableStatus(status: MvpOrder["status"]) {
  return adminFulfillmentStatuses.includes(
    status as (typeof adminFulfillmentStatuses)[number]
  )
    ? status
    : "paid";
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
