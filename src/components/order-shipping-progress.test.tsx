import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderShippingProgress } from "./order-shipping-progress";

describe("OrderShippingProgress", () => {
  it("marks paid, preparing, and shipped steps active for a shipped order", () => {
    render(<OrderShippingProgress status="shipped" />);

    const progress = screen.getByRole("list", { name: "Delivery progress" });

    expect(within(progress).getByText("Paid")).toHaveAttribute("data-active", "true");
    expect(within(progress).getByText("Preparing")).toHaveAttribute(
      "data-active",
      "true"
    );
    expect(within(progress).getByText("Shipped")).toHaveAttribute(
      "data-active",
      "true"
    );
    expect(within(progress).getByText("Delivered")).toHaveAttribute(
      "data-active",
      "false"
    );
    expect(screen.getByText("Your package is on the way.")).toBeVisible();
  });

  it("shows a terminal notice for refunded orders", () => {
    render(<OrderShippingProgress status="refunded" />);

    expect(screen.getByRole("status")).toHaveTextContent("Order closed");
    expect(screen.getByText("This order is refunded.")).toBeVisible();
  });

  it("shows a terminal notice for cancelled orders", () => {
    render(<OrderShippingProgress status="cancelled" />);

    expect(screen.getByRole("status")).toHaveTextContent("Order closed");
    expect(screen.getByText("This order is cancelled.")).toBeVisible();
  });
});
