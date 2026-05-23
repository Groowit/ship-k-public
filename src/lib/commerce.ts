export const DEFAULT_CURRENCY = "USD" as const;
export const FREE_SHIPPING_THRESHOLD_CENTS = 7_500;
export const STANDARD_SHIPPING_FEE_CENTS = 999;
export const DEFAULT_COMMISSION_RATE_BPS = 1_000;

export type CurrencyCode = typeof DEFAULT_CURRENCY;

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderLineInput = {
  unitPriceCents: number;
  quantity: number;
};

export type OrderTotals = {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: CurrencyCode;
};

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled", "refunded"],
  preparing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: []
};

export function calculateShippingCents(
  subtotalCents: number,
  freeThresholdCents = FREE_SHIPPING_THRESHOLD_CENTS,
  feeCents = STANDARD_SHIPPING_FEE_CENTS
) {
  assertNonNegativeInteger(subtotalCents, "subtotalCents");
  return subtotalCents >= freeThresholdCents ? 0 : feeCents;
}

export function calculateCommissionCents({
  productNetCents,
  rateBps = DEFAULT_COMMISSION_RATE_BPS
}: {
  productNetCents: number;
  shippingCents?: number;
  discountCents?: number;
  rateBps?: number;
}) {
  assertNonNegativeInteger(productNetCents, "productNetCents");
  assertNonNegativeInteger(rateBps, "rateBps");
  return Math.round((productNetCents * rateBps) / 10_000);
}

export function calculateOrderTotals(items: OrderLineInput[]): OrderTotals {
  const subtotalCents = items.reduce((sum, item) => {
    assertNonNegativeInteger(item.unitPriceCents, "unitPriceCents");
    assertPositiveInteger(item.quantity, "quantity");
    return sum + item.unitPriceCents * item.quantity;
  }, 0);
  const shippingCents = calculateShippingCents(subtotalCents);

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    currency: DEFAULT_CURRENCY
  };
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus) {
  return allowedOrderTransitions[from]?.includes(to) ?? false;
}

export function shouldCreateReferralCommission({
  affiliateProfileId,
  orderUserId,
  affiliateStatus,
  linkStatus = "active",
  affiliateEmail,
  orderEmail,
  affiliatePhone,
  orderPhone
}: {
  affiliateProfileId: string | null | undefined;
  orderUserId: string | null | undefined;
  affiliateStatus: "active" | "paused" | "blocked" | string;
  linkStatus?: "active" | "paused" | string;
  affiliateEmail?: string | null;
  orderEmail?: string | null;
  affiliatePhone?: string | null;
  orderPhone?: string | null;
}) {
  if (affiliateStatus !== "active" || linkStatus !== "active") {
    return false;
  }
  if (affiliateProfileId && orderUserId && affiliateProfileId === orderUserId) {
    return false;
  }
  if (normalizeEmail(affiliateEmail) && normalizeEmail(affiliateEmail) === normalizeEmail(orderEmail)) {
    return false;
  }
  if (normalizePhone(affiliatePhone) && normalizePhone(affiliatePhone) === normalizePhone(orderPhone)) {
    return false;
  }
  return true;
}

export function isAdminEmail(email: string | null | undefined, adminEmail: string) {
  if (!email || !adminEmail) {
    return false;
  }
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

export function assertAdminEmail(
  email: string | null | undefined,
  adminEmail: string
) {
  if (!isAdminEmail(email, adminEmail)) {
    throw new Error("Admin access required");
  }
}

export function formatUsd(cents: number) {
  assertNonNegativeInteger(cents, "cents");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: DEFAULT_CURRENCY
  }).format(cents / 100);
}

export function toCents(amount: number) {
  if (!Number.isFinite(amount)) {
    throw new Error("amount must be finite");
  }
  return Math.round(amount * 100);
}

function assertNonNegativeInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") || "";
}
