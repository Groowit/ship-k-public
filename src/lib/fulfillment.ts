import type { OrderStatus } from "./commerce";

export const fulfillmentCarriers = ["USPS", "UPS", "FedEx", "DHL"] as const;

export type FulfillmentCarrier = (typeof fulfillmentCarriers)[number];

export const adminFulfillmentStatuses = [
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "refunded"
] as const;

export type AdminFulfillmentStatus = (typeof adminFulfillmentStatuses)[number];

export const adminFulfillmentStatusLabels: Record<AdminFulfillmentStatus, string> = {
  paid: "결제 완료",
  preparing: "준비 중",
  shipped: "배송 중",
  delivered: "배송 완료",
  refunded: "환불 완료"
};

export const customerOrderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Paid",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded"
};

export function getCustomerOrderStatusLabel(status: OrderStatus) {
  return customerOrderStatusLabels[status];
}

export function shouldAutoMarkShipped({
  status,
  carrier,
  trackingNumber
}: {
  status: OrderStatus;
  carrier?: string;
  trackingNumber?: string;
}) {
  return (
    status !== "delivered" &&
    status !== "refunded" &&
    Boolean(carrier?.trim()) &&
    Boolean(trackingNumber?.trim())
  );
}
