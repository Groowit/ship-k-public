import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountOrdersClient } from "./account-orders-client";
import type { CommerceOrder } from "@/lib/commerce-store";

describe("AccountOrdersClient", () => {
  it("renders an order management summary and detail links", () => {
    render(<AccountOrdersClient orders={ordersFixture()} />);

    expect(screen.getByRole("link", { name: /Back to My Page/i })).toHaveAttribute(
      "href",
      "/account"
    );
    expect(screen.getByRole("heading", { name: "Orders" })).toBeVisible();
    expect(screen.getByText("Total orders")).toBeVisible();
    expect(screen.getByText("3 orders")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByText("Carrier details ready")).toBeVisible();
    expect(screen.getByText("Closed")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 3 of 3 orders");
    expect(screen.getAllByRole("link", { name: /View details/i })).toHaveLength(3);
  });

  it("filters by search query and status, then restores results", () => {
    render(<AccountOrdersClient orders={ordersFixture()} />);

    fireEvent.change(screen.getByLabelText("Search orders"), {
      target: { value: "hydration" }
    });

    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 3 orders");
    expect(screen.getByText("Hydration Routine")).toBeVisible();
    expect(screen.queryByText("Glow Set")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "delivered" }
    });

    expect(screen.getByText("No orders match your filters.")).toBeVisible();

    const resetButtons = screen.getAllByRole("button", { name: "Reset filters" });
    fireEvent.click(resetButtons[resetButtons.length - 1]);

    expect(screen.getByRole("status")).toHaveTextContent("Showing 3 of 3 orders");
  });

  it("sorts by oldest order when selected", () => {
    render(<AccountOrdersClient orders={ordersFixture()} />);

    const list = screen.getByTestId("orders-list");
    expect(within(list).getAllByRole("article")[0]).toHaveAccessibleName(
      "SK-1003 Lip Tint Trio"
    );

    fireEvent.change(screen.getByLabelText("Sort orders"), {
      target: { value: "oldest" }
    });

    expect(within(list).getAllByRole("article")[0]).toHaveAccessibleName(
      "SK-1001 Glow Set"
    );
  });
});

function ordersFixture(): CommerceOrder[] {
  return [
    orderFixture({
      id: "order_1",
      orderNumber: "SK-1001",
      productName: "Glow Set",
      status: "paid",
      createdAt: "2026-05-28T12:00:00.000Z",
      totalCents: 5899
    }),
    orderFixture({
      id: "order_2",
      orderNumber: "SK-1002",
      productName: "Hydration Routine",
      status: "shipped",
      createdAt: "2026-05-30T12:00:00.000Z",
      shipmentCarrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      totalCents: 7599
    }),
    orderFixture({
      id: "order_3",
      orderNumber: "SK-1003",
      productName: "Lip Tint Trio",
      status: "delivered",
      createdAt: "2026-06-01T12:00:00.000Z",
      totalCents: 3299
    })
  ];
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
    status: "paid",
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
    createdAt: "2026-05-28T12:00:00.000Z",
    ...overrides
  };
}
