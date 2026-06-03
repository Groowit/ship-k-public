import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";
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

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects signed-out customers to auth", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({ user: null, profile: null });

    await expect(AccountPage()).rejects.toThrow("redirect:/auth?next=%2Faccount");
    expect(listOrdersByUser).not.toHaveBeenCalled();
  });

  it("renders the account hub without visible edit inputs by default", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "user_1", email: "jamie@example.com" } as never,
      profile: profileFixture()
    });
    vi.mocked(listOrdersByUser).mockResolvedValue([
      orderFixture(),
      orderFixture({
        id: "order_2",
        orderNumber: "SK-1002",
        productName: "Hydration Routine",
        status: "paid"
      })
    ]);

    render(await AccountPage());

    expect(listOrdersByUser).toHaveBeenCalledWith("user_1");
    expect(screen.getByRole("heading", { name: "My Page" })).toBeVisible();
    expect(screen.getByText("Account hub")).toBeVisible();
    expect(screen.getByText("2 orders")).toBeVisible();
    expect(screen.getByText("Default shipping ready")).toBeVisible();
    expect(screen.getByText("Email updates on")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Recent orders" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Account essentials" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "View all orders" })[0]).toHaveAttribute(
      "href",
      "/account/orders"
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Continue shopping")).not.toBeInTheDocument();
  });
});

function profileFixture() {
  return {
    id: "user_1",
    email: "jamie@example.com",
    role: "customer" as const,
    fullName: "Jamie Park",
    phone: "2135550144",
    marketingOptIn: true,
    termsAcceptedAt: "2026-05-01T00:00:00.000Z",
    privacyAcceptedAt: "2026-05-01T00:00:00.000Z",
    marketingOptInAt: "2026-05-01T00:00:00.000Z",
    defaultShippingAddress: {
      name: "Jamie Park",
      phone: "2135550144",
      address1: "123 Ocean Ave",
      address2: "",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "US",
      memo: ""
    }
  };
}

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
