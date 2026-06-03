import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTrackingCard } from "./order-tracking-card";

describe("OrderTrackingCard", () => {
  it("shows shipment guidance without fake pending carrier fields before shipment", () => {
    render(<OrderTrackingCard status="paid" />);

    expect(screen.getByRole("heading", { name: "Tracking details" })).toBeVisible();
    expect(screen.getByText("Tracking not available yet")).toBeVisible();
    expect(screen.getByText("Tracking will appear after your order ships.")).toBeVisible();
    expect(screen.queryByText("Carrier")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracking number")).not.toBeInTheDocument();
  });

  it("shows carrier, tracking number, and tracking action after shipment", () => {
    render(
      <OrderTrackingCard
        status="shipped"
        carrier="UPS"
        trackingNumber="1Z999AA10123456784"
        trackingUrl="https://www.ups.com/track?tracknum=1Z999AA10123456784"
      />
    );

    expect(screen.getByText("UPS")).toBeVisible();
    expect(screen.getByText("1Z999AA10123456784")).toBeVisible();
    expect(screen.getByRole("link", { name: /Track package/i })).toHaveAttribute(
      "href",
      "https://www.ups.com/track?tracknum=1Z999AA10123456784"
    );
  });

  it("hides the tracking action when the parent page owns the primary CTA", () => {
    render(
      <OrderTrackingCard
        status="shipped"
        carrier="UPS"
        trackingNumber="1Z999AA10123456784"
        trackingUrl="https://www.ups.com/track?tracknum=1Z999AA10123456784"
        showAction={false}
      />
    );

    expect(screen.getByText("UPS")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Track package/i })).not.toBeInTheDocument();
  });

  it("explains unsupported carrier tracking without showing a broken link", () => {
    render(
      <OrderTrackingCard
        status="shipped"
        carrier="Unknown Carrier"
        trackingNumber="TRACK123"
      />
    );

    expect(screen.getByText("Unknown Carrier")).toBeVisible();
    expect(screen.getByText("Use the carrier website to track this package.")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Track package/i })).not.toBeInTheDocument();
  });
});
