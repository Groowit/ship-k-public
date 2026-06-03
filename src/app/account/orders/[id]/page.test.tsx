import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountOrderDetailPage from "./page";
import { getCurrentAuthState } from "@/lib/auth";
import {
  getOrderByUser,
  getTrackingUrl,
  type CommerceOrder
} from "@/lib/commerce-store";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  })
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
  notFound: navigationMocks.notFound
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAuthState: vi.fn()
}));

vi.mock("@/lib/commerce-store", () => ({
  getOrderByUser: vi.fn(),
  getTrackingUrl: vi.fn()
}));

describe("AccountOrderDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects signed-out customers to auth with the detail next path", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({ user: null, profile: null });

    await expect(
      AccountOrderDetailPage({ params: Promise.resolve({ id: "order_1" }) })
    ).rejects.toThrow("redirect:/auth?next=%2Faccount%2Forders%2Forder_1");
    expect(getOrderByUser).not.toHaveBeenCalled();
  });

  it("calls notFound when the order is unavailable", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "user_1", email: "jamie@example.com" } as never,
      profile: null
    });
    vi.mocked(getOrderByUser).mockResolvedValue(undefined);

    await expect(
      AccountOrderDetailPage({ params: Promise.resolve({ id: "order_1" }) })
    ).rejects.toThrow("not-found");
  });

  it("renders status-first delivery details with stable location labels", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "user_1", email: "jamie@example.com" } as never,
      profile: null
    });
    vi.mocked(getOrderByUser).mockResolvedValue(orderFixture());
    vi.mocked(getTrackingUrl).mockReturnValue(
      "https://www.ups.com/track?tracknum=1Z999AA10123456784"
    );

    render(await AccountOrderDetailPage({ params: Promise.resolve({ id: "order_1" }) }));

    const location = screen.getByRole("navigation", { name: "Order location" });
    expect(within(location).getByRole("link", { name: "My Page" })).toHaveAttribute(
      "href",
      "/account"
    );
    expect(within(location).getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/account/orders"
    );
    expect(screen.queryByText(/Back to orders/i)).not.toBeInTheDocument();
    expect(screen.getByText("Order status")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Package on the way" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Track package/i })).toHaveAttribute(
      "href",
      "https://www.ups.com/track?tracknum=1Z999AA10123456784"
    );
    expect(screen.getByRole("heading", { name: "Delivery progress" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Items in this order" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tracking details" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Payment summary" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Shipping address" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Need help with this order?" })).toBeVisible();
  });

  it("explains preparing orders without fake tracking fields", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "user_1", email: "jamie@example.com" } as never,
      profile: null
    });
    vi.mocked(getOrderByUser).mockResolvedValue(
      orderFixture({
        status: "preparing",
        shipmentCarrier: undefined,
        trackingNumber: undefined
      })
    );
    vi.mocked(getTrackingUrl).mockReturnValue(undefined);

    render(await AccountOrderDetailPage({ params: Promise.resolve({ id: "order_1" }) }));

    expect(screen.getByRole("heading", { name: "Preparing your order" })).toBeVisible();
    expect(
      screen.getAllByText("Tracking will appear after your order ships.").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Carrier")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Track package/i })).not.toBeInTheDocument();
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
