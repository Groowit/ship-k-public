import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutForm } from "./checkout-form";
import { demoProducts } from "@/lib/products";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("@paypal/react-paypal-js", () => ({
  PayPalButtons: () => <div data-testid="paypal-buttons" />,
  PayPalScriptProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe("CheckoutForm", () => {
  it("prefills saved customer and default shipping fields", () => {
    const initialCustomer = {
      name: "Jamie Park",
      email: "jamie@example.com",
      phone: "2135550144",
      address1: "123 Ocean Ave",
      address2: "Apt 4",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      memo: "Leave near the front desk"
    };

    render(
      <CheckoutForm
        product={demoProducts[0]}
        quantity={1}
        initialCustomer={initialCustomer}
      />
    );

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Jamie Park");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue(
      "jamie@example.com"
    );
    expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("2135550144");
    expect(screen.getByRole("textbox", { name: "Address line 1" })).toHaveValue(
      "123 Ocean Ave"
    );
    expect(screen.getByRole("textbox", { name: "Address line 2" })).toHaveValue(
      "Apt 4"
    );
    expect(screen.getByRole("textbox", { name: "City" })).toHaveValue("Los Angeles");
    expect(screen.getByRole("textbox", { name: "State" })).toHaveValue("CA");
    expect(screen.getByRole("textbox", { name: "ZIP code" })).toHaveValue("90001");
    expect(screen.getByRole("textbox", { name: "Delivery memo" })).toHaveValue(
      "Leave near the front desk"
    );
  });
});
