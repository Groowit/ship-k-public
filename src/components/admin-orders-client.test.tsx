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
  it("keeps fulfillment editing closed until an order is opened", () => {
    render(<AdminOrdersClient orders={[orderFixture]} />);

    expect(screen.queryByTestId("fulfillment-form-order_1")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

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

    fireEvent.click(screen.getByTestId("admin-order-order_1"));
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
    await waitFor(() =>
      expect(screen.queryByTestId("fulfillment-form-order_1")).not.toBeInTheDocument()
    );
    expect(screen.getByText("FedEx · 123456789012")).toBeInTheDocument();
  });

  it("shows only admin-update statuses accepted by the API", () => {
    render(<AdminOrdersClient orders={[orderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_1"));
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

  it("sorts orders by newest first by default", () => {
    render(<AdminOrdersClient orders={[orderFixture, secondOrderFixture]} />);

    expect(getRenderedOrderLabels()).toEqual([
      "SK654321 배송 정보 수정 열기",
      "SK123456 배송 정보 수정 열기"
    ]);
  });

  it("allows admins to switch to fulfillment-priority sorting", () => {
    render(<AdminOrdersClient orders={[orderFixture, secondOrderFixture]} />);

    fireEvent.change(screen.getByLabelText("Sort orders"), {
      target: { value: "fulfillment-priority" }
    });

    expect(getRenderedOrderLabels()).toEqual([
      "SK123456 배송 정보 수정 열기",
      "SK654321 배송 정보 수정 열기"
    ]);
  });

  it("opens a fulfillment dialog from an order card", () => {
    render(<AdminOrdersClient orders={[orderFixture, secondOrderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_2"));

    expect(
      screen.getByRole("dialog", { name: "Fulfillment SK654321" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("fulfillment-form-order_2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("UPS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1Z999")).toBeInTheDocument();
  });

  it("renders the fulfillment dialog in a centered top-level portal", async () => {
    const { container } = render(<AdminOrdersClient orders={[orderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_1"));

    const dialog = await screen.findByRole("dialog", {
      name: "Fulfillment SK123456"
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).toBe(dialog);
    expect(screen.getByTestId("fulfillment-dialog-backdrop").className).toContain(
      "items-center"
    );
    expect(screen.getByTestId("fulfillment-dialog-backdrop").className).toContain(
      "z-[10000]"
    );
  });

  it("closes the fulfillment dialog with Escape and returns focus to the order card", async () => {
    render(<AdminOrdersClient orders={[orderFixture]} />);

    const orderCard = screen.getByTestId("admin-order-order_1");
    fireEvent.click(orderCard);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(orderCard).toHaveFocus();
  });

  it("closes the fulfillment dialog from the close button and backdrop", async () => {
    render(<AdminOrdersClient orders={[orderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_1"));
    fireEvent.click(screen.getByRole("button", { name: "배송 정보 모달 닫기" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId("admin-order-order_1"));
    fireEvent.mouseDown(screen.getByTestId("fulfillment-dialog-backdrop"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps keyboard focus contained inside the fulfillment dialog", () => {
    render(<AdminOrdersClient orders={[orderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_1"));
    const dialog = screen.getByRole("dialog");
    const closeButton = within(dialog).getByRole("button", {
      name: "배송 정보 모달 닫기"
    });
    const submitButton = within(dialog).getByTestId("update-order-order_1");

    submitButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(submitButton).toHaveFocus();
  });

  it("falls back to the search input when the opened order card is filtered away", async () => {
    render(<AdminOrdersClient orders={[orderFixture, secondOrderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_2"));
    fireEvent.change(screen.getByLabelText("Search orders"), {
      target: { value: "jamie@example.com" }
    });
    expect(screen.queryByTestId("admin-order-order_2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "배송 정보 모달 닫기" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Search orders")).toHaveFocus();
  });

  it("keeps the fulfillment dialog open when saving fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "운송장 번호가 필요합니다." })
    });
    global.fetch = fetchMock as typeof fetch;

    render(<AdminOrdersClient orders={[orderFixture]} />);

    fireEvent.click(screen.getByTestId("admin-order-order_1"));
    fireEvent.submit(screen.getByTestId("fulfillment-form-order_1"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("운송장 번호가 필요합니다.")).toBeInTheDocument();
  });
});

function getRenderedOrderLabels() {
  return screen
    .getAllByRole("button", { name: /배송 정보 수정 열기/ })
    .map((button) => button.getAttribute("aria-label"));
}

const orderFixture: CommerceOrder = {
  id: "order_1",
  userId: "buyer_1",
  orderNumber: "SK123456",
  productSlug: "skincare-starter-set",
  productName: "Skincare Starter Set",
  optionName: "5-item set",
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
  productSlug: "warm-makeup-set",
  productName: "Warm Makeup Set",
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
