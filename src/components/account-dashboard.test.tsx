import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDashboard } from "./account-dashboard";
import type { CommerceOrder } from "@/lib/commerce-store";

describe("AccountDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps profile and shipping inputs hidden until a selected edit dialog opens", () => {
    render(<AccountDashboard profile={profileFixture()} orders={[orderFixture()]} />);

    expect(screen.getByRole("heading", { name: "My Page" })).toBeVisible();
    expect(screen.getByText("Account hub")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Full name" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Address line 1" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));

    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Jamie Park");
    expect(
      screen.queryByRole("textbox", { name: "Address line 1" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close account edit dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit shipping" }));

    expect(screen.queryByRole("textbox", { name: "Full name" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Edit shipping" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Address line 1" })).toHaveValue(
      "123 Ocean Ave"
    );
  });

  it("posts updates and closes the edit panel after a successful save", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response);

    render(<AccountDashboard profile={profileFixture()} orders={[orderFixture()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), {
      target: { value: "3105550199" }
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Email updates/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/profile",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"phone":"3105550199"')
      })
    );
    expect(fetchMock.mock.calls[0][1]?.body).toEqual(
      expect.stringContaining('"marketingOptIn":true')
    );
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "Phone" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("status")).toHaveTextContent("Account details saved.");
  });

  it("keeps a failed edit open with an alert", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not update account" })
    } as Response);

    render(<AccountDashboard profile={profileFixture()} orders={[orderFixture()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit shipping" }));
    fireEvent.change(screen.getByRole("textbox", { name: "ZIP code" }), {
      target: { value: "90002" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not update account"
    );
    expect(screen.getByRole("dialog", { name: "Edit shipping" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Address line 1" })).toBeVisible();
  });

  it("closes the edit panel on cancel without posting", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<AccountDashboard profile={profileFixture()} orders={[orderFixture()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit shipping" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Address line 1" }), {
      target: { value: "456 Sunset Blvd" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("textbox", { name: "Address line 1" })
    ).not.toBeInTheDocument();
  });

  it("closes the edit dialog with Escape", () => {
    render(<AccountDashboard profile={profileFixture()} orders={[orderFixture()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Edit profile" })).not.toBeInTheDocument();
  });
});

function profileFixture() {
  return {
    email: "jamie@example.com",
    fullName: "Jamie Park",
    phone: "2135550144",
    marketingOptIn: false,
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
