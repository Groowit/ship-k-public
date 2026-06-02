"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminFulfillmentStatusLabels,
  adminFulfillmentStatuses,
  fulfillmentCarriers
} from "@/lib/fulfillment";
import type { CommerceOrder } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | (typeof adminFulfillmentStatuses)[number];
type CarrierFilter = "all" | "none" | (typeof fulfillmentCarriers)[number];
type SortOption =
  | "created-desc"
  | "created-asc"
  | "fulfillment-priority"
  | "total-desc"
  | "total-asc";

export function AdminOrdersClient({ orders }: { orders: CommerceOrder[] }) {
  const [rows, setRows] = useState(orders);
  const [editingOrderId, setEditingOrderId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [carrierFilter, setCarrierFilter] = useState<CarrierFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("created-desc");
  const [errorByOrderId, setErrorByOrderId] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorTriggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredRows = useMemo(
    () => filterOrders(rows, { query, statusFilter, carrierFilter }),
    [rows, query, statusFilter, carrierFilter]
  );
  const displayedRows = useMemo(
    () => sortOrders(filteredRows, sortOption),
    [filteredRows, sortOption]
  );
  const editingOrder = rows.find((order) => order.id === editingOrderId) ?? null;

  function openFulfillmentEditor(orderId: string, trigger: HTMLButtonElement) {
    editorTriggerRef.current = trigger;
    setEditingOrderId(orderId);
  }

  function closeFulfillmentEditor() {
    setEditingOrderId("");
    window.setTimeout(() => {
      const trigger = editorTriggerRef.current;
      const focusTarget =
        trigger && document.contains(trigger) ? trigger : searchInputRef.current;
      focusTarget?.focus();
    }, 0);
  }

  async function updateShipment(orderId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await submitShipment(orderId, event.currentTarget);
    if (saved) {
      closeFulfillmentEditor();
    }
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
      return true;
    } else {
      setErrorByOrderId((current) => ({
        ...current,
        [orderId]: payload.error ?? "배송 정보를 저장하지 못했습니다."
      }));
      return false;
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
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_160px_160px_180px]">
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
                ref={searchInputRef}
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
              Sort
            </span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="focus-ring h-11 rounded-md border bg-white px-3 text-sm font-semibold"
              aria-label="Sort orders"
            >
              <option value="created-desc">최신 주문순</option>
              <option value="created-asc">오래된 주문순</option>
              <option value="fulfillment-priority">처리 필요순</option>
              <option value="total-desc">주문 금액 높은순</option>
              <option value="total-asc">주문 금액 낮은순</option>
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
          {displayedRows.length} / {rows.length} orders
        </p>
      </div>

      <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {displayedRows.length ? (
          displayedRows.map((order) => (
            <button
              key={order.id}
              type="button"
              data-testid={`admin-order-${order.id}`}
              aria-haspopup="dialog"
              aria-label={`${order.orderNumber} 배송 정보 수정 열기`}
              onClick={(event) => openFulfillmentEditor(order.id, event.currentTarget)}
              className="focus-ring grid min-h-[13.5rem] gap-4 rounded-md border-2 border-black bg-white p-4 text-left transition hover:bg-[#fff8f0] focus-visible:bg-[#fff8f0]"
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

              <span className="mt-auto grid gap-3 border-t pt-3 text-sm">
                <span className="font-semibold">{order.productName}</span>
                <span className="flex items-center justify-between gap-3 text-muted-foreground">
                  <span>{formatShipmentSummary(order)}</span>
                  <span className="font-black text-foreground">
                    ${(order.totalCents / 100).toFixed(2)}
                  </span>
                </span>
                <span className="inline-flex w-fit items-center rounded-md border-2 border-black bg-[#fff8f0] px-3 py-2 text-xs font-black">
                  배송 정보 수정
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-md border-2 border-black bg-white p-5 text-muted-foreground md:col-span-2 xl:col-span-3 2xl:col-span-4">
            조건에 맞는 주문이 없습니다.
          </div>
        )}
      </div>

      {editingOrder ? (
        <FulfillmentDialog
          key={`${editingOrder.id}-${editingOrder.status}-${editingOrder.shipmentCarrier ?? ""}-${editingOrder.trackingNumber ?? ""}`}
          order={editingOrder}
          error={errorByOrderId[editingOrder.id]}
          onClose={closeFulfillmentEditor}
          onSubmit={updateShipment}
        />
      ) : null}
    </div>
  );
}

function FulfillmentDialog({
  order,
  error,
  onClose,
  onSubmit
}: {
  order: CommerceOrder;
  error?: string;
  onClose: () => void;
  onSubmit: (orderId: string, event: FormEvent<HTMLFormElement>) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const titleId = `fulfillment-dialog-title-${order.id}`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const initialFocusTarget =
        panelRef.current?.querySelector<HTMLElement>('select[name="status"]') ??
        panelRef.current?.querySelector<HTMLElement>("button");
      initialFocusTarget?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusableElements = getFocusableElements(panel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!panel.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMounted, onClose]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      data-testid="fulfillment-dialog-backdrop"
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-5 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[calc(100vh-2.5rem)] w-full max-w-xl overflow-y-auto rounded-md border-2 border-black bg-white p-4 sm:p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Fulfillment
            </p>
            <h2 id={titleId} className="mt-1 shipk-heading text-3xl">
              Fulfillment {order.orderNumber}
            </h2>
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {order.shippingAddress.email}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="배송 정보 모달 닫기"
            onClick={onClose}
            className="shrink-0 border-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <OrderEditor
          order={order}
          error={error}
          onSubmit={onSubmit}
        />
      </div>
    </div>,
    document.body
  );
}

function OrderEditor({
  order,
  error,
  onSubmit
}: {
  order: CommerceOrder;
  error?: string;
  onSubmit: (orderId: string, event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={(event) => onSubmit(order.id, event)}
      data-testid={`fulfillment-form-${order.id}`}
      className="grid gap-4"
    >
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
        <p role="status" className="text-xs font-semibold text-destructive">{error}</p>
      ) : null}
    </form>
  );
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden"));
}

function filterOrders(
  orders: CommerceOrder[],
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

function sortOrders(orders: CommerceOrder[], sortOption: SortOption) {
  return [...orders].sort((left, right) => {
    const fallback = compareByNewest(left, right);

    if (sortOption === "created-desc") {
      return fallback;
    }

    if (sortOption === "created-asc") {
      return compareByOldest(left, right);
    }

    if (sortOption === "fulfillment-priority") {
      return (
        getFulfillmentPriority(left.status) -
          getFulfillmentPriority(right.status) ||
        fallback
      );
    }

    if (sortOption === "total-desc") {
      return right.totalCents - left.totalCents || fallback;
    }

    return left.totalCents - right.totalCents || fallback;
  });
}

function compareByNewest(left: CommerceOrder, right: CommerceOrder) {
  return (
    getOrderTimestamp(right.createdAt) - getOrderTimestamp(left.createdAt) ||
    right.orderNumber.localeCompare(left.orderNumber)
  );
}

function compareByOldest(left: CommerceOrder, right: CommerceOrder) {
  return (
    getOrderTimestamp(left.createdAt) - getOrderTimestamp(right.createdAt) ||
    left.orderNumber.localeCompare(right.orderNumber)
  );
}

function getOrderTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getFulfillmentPriority(status: CommerceOrder["status"]) {
  const priorities: Record<CommerceOrder["status"], number> = {
    paid: 0,
    preparing: 1,
    shipped: 2,
    pending_payment: 3,
    delivered: 4,
    refunded: 5,
    cancelled: 6
  };

  return priorities[status];
}

function StatusBadge({ status }: { status: CommerceOrder["status"] }) {
  return (
    <Badge className={cn("shrink-0 border-2 border-black font-black", getStatusClass(status))}>
      {getOrderStatusLabel(status)}
    </Badge>
  );
}

function getStatusClass(status: CommerceOrder["status"]) {
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

function formatShipmentSummary(order: CommerceOrder) {
  if (order.shipmentCarrier && order.trackingNumber) {
    return `${order.shipmentCarrier} · ${order.trackingNumber}`;
  }

  if (order.shipmentCarrier) {
    return order.shipmentCarrier;
  }

  return "배송 정보 없음";
}

function getOrderStatusLabel(status: CommerceOrder["status"]) {
  const labels: Record<CommerceOrder["status"], string> = {
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

function getAdminEditableStatus(status: CommerceOrder["status"]) {
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
