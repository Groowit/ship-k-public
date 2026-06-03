import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountOrdersPage from "./page";
import { getCurrentAuthState } from "@/lib/auth";
import { listOrdersByUser } from "@/lib/commerce-store";
import type { CommerceOrder } from "@/lib/commerce-store";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  })
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAuthState: vi.fn()
}));

vi.mock("@/lib/commerce-store", () => ({
  listOrdersByUser: vi.fn()
}));

describe("AccountOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects signed-out customers to auth", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({ user: null, profile: null });

    await expect(AccountOrdersPage()).rejects.toThrow(
      "redirect:/auth?next=%2Faccount%2Forders"
    );
    expect(listOrdersByUser).not.toHaveBeenCalled();
  });

  it("loads authenticated customer orders into the management page", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "user_1", email: "jamie@example.com" } as never,
      profile: null
    });
    vi.mocked(listOrdersByUser).mockResolvedValue([orderFixture()]);

    render(await AccountOrdersPage());

    expect(listOrdersByUser).toHaveBeenCalledWith("user_1");
    expect(screen.getByRole("heading", { name: "Orders" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1 orders");
    expect(screen.getByRole("link", { name: /View details/i })).toHaveAttribute(
      "href",
      "/account/orders/order_1"
    );
  });
});

function orderFixture(overrides: Partial<CommerceOrder> = {}): CommerceOrder {
  return {
    id: "order_1",
    userId: "user_1",
    orderNumber: "SK-1001",
    productSlug: "glow-set",
    productName: "Glow Set",
    optionName: "2-item set",
    quantity: 1,
    subtotalCents: 4900,
    shippingCents: 999,
    totalCents: 5899,
    currency: "USD",
    status: "shipped",
    paymentProvider: "paypal",
    paymentProviderOrderId: "PAYPAL-1",
    shippingAddress: {
      name: "Jamie Park",
      email: "jamie@example.com",
      phone: "2135550144",
      address1: "123 Ocean Ave",
      address2: "",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "US",
      memo: ""
    },
    shipmentCarrier: "UPS",
    trackingNumber: "1Z999AA10123456784",
    createdAt: "2026-06-01T12:00:00.000Z",
    ...overrides
  };
}
