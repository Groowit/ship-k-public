import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminOrdersClient } from "./admin-orders-client";
import type { CommerceOrder } from "@/lib/commerce-store";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("AdminOrdersClient", () => {
  it("sends carrier and tracking details for a single order update", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        order: {
          ...orderFixture,
          status: "shipped",
          shipmentCarrier: "FedEx",
          trackingNumber: "123456789012"
        }
      })
    });
    global.fetch = fetchMock as typeof fetch;

    render(<AdminOrdersClient orders={[orderFixture]} />);

    const form = screen.getByTestId("fulfillment-form-order_1");
    fireEvent.change(within(form).getByLabelText("Status"), {
      target: { value: "preparing" }
    });
    fireEvent.change(within(form).getByLabelText("Carrier"), {
      target: { value: "FedEx" }
    });
    fireEvent.change(within(form).getByLabelText("Tracking number"), {
      target: { value: "123456789012" }
    });
    fireEvent.submit(form);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      status: "preparing",
      carrier: "FedEx",
      trackingNumber: "123456789012"
    });
  });

  it("shows only admin-update statuses accepted by the API", () => {
    render(<AdminOrdersClient orders={[orderFixture]} />);

    const form = screen.getByTestId("fulfillment-form-order_1");
    const statusSelect = within(form).getByLabelText("Status");
    const values = within(statusSelect)
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"));

    expect(values).toEqual(["paid", "preparing", "shipped", "delivered", "refunded"]);
  });

  it("filters the order grid by customer search", () => {
    render(<AdminOrdersClient orders={[orderFixture, secondOrderFixture]} />);

    expect(screen.getByTestId("admin-order-order_1")).toBeInTheDocument();
    expect(screen.getByTestId("admin-order-order_2")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search orders"), {
      target: { value: "alex@example.com" }
    });

    expect(screen.queryByTestId("admin-order-order_1")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-order-order_2")).toBeInTheDocument();
  });

  it("selects an order card before editing its fulfillment details", () => {
    render(<AdminOrdersClient orders={[orderFixture, secondOrderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_2"));

    expect(screen.getByTestId("fulfillment-form-order_2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("UPS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1Z999")).toBeInTheDocument();
  });
});

const orderFixture: CommerceOrder = {
  id: "order_1",
  userId: "buyer_1",
  orderNumber: "SK123456",
  productSlug: "daily-k-glow-set",
  productName: "Daily K-Glow Set",
  optionName: "5-item routine kit",
  quantity: 1,
  subtotalCents: 4900,
  shippingCents: 999,
  totalCents: 5899,
  currency: "USD",
  status: "paid",
  paymentProvider: "paypal",
  paymentProviderOrderId: "PAYPAL-ORDER-1",
  shippingAddress: {
    name: "Jamie Park",
    email: "jamie@example.com",
    phone: "2135550144",
    address1: "123 Ocean Ave",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
    country: "US"
  },
  createdAt: "2026-05-21T00:00:00.000Z"
};

const secondOrderFixture: CommerceOrder = {
  ...orderFixture,
  id: "order_2",
  userId: "buyer_2",
  orderNumber: "SK654321",
  productSlug: "warm-honey-look",
  productName: "Warm Honey Look",
  status: "shipped",
  shippingAddress: {
    ...orderFixture.shippingAddress,
    name: "Alex Kim",
    email: "alex@example.com"
  },
  shipmentCarrier: "UPS",
  trackingNumber: "1Z999",
  createdAt: "2026-05-22T00:00:00.000Z"
};
