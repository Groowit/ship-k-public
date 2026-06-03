import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "./page";
import { getCurrentAuthState } from "@/lib/auth";
import { findProductBySlug } from "@/lib/commerce-store";
import { launchCatalogProducts } from "@/lib/products";

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
  findProductBySlug: vi.fn()
}));

vi.mock("@/components/checkout-form", () => ({
  CheckoutForm: ({
    initialCustomer
  }: {
    initialCustomer: Record<string, string>;
  }) => (
    <div
      data-testid="checkout-form"
      data-initial-customer={JSON.stringify(initialCustomer)}
    />
  )
}));

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills checkout from the saved default shipping address", async () => {
    vi.mocked(findProductBySlug).mockResolvedValue(launchCatalogProducts[0]);
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "user_1", email: "login@example.com" } as never,
      profile: {
        id: "user_1",
        email: "profile@example.com",
        role: "customer",
        fullName: "Profile Name",
        phone: "2135550000",
        marketingOptIn: true,
        termsAcceptedAt: "2026-05-01T00:00:00.000Z",
        privacyAcceptedAt: "2026-05-01T00:00:00.000Z",
        marketingOptInAt: "2026-05-01T00:00:00.000Z",
        defaultShippingAddress: {
          name: "Shipping Recipient",
          phone: "3105550199",
          address1: "123 Ocean Ave",
          address2: "Unit 4",
          city: "Los Angeles",
          state: "CA",
          postalCode: "90001",
          country: "US",
          memo: "Leave at door"
        }
      }
    });

    render(
      await CheckoutPage({
        searchParams: Promise.resolve({
          product: launchCatalogProducts[0].slug,
          qty: "2"
        })
      })
    );

    const payload = JSON.parse(
      screen.getByTestId("checkout-form").dataset.initialCustomer ?? "{}"
    ) as Record<string, string>;

    expect(payload).toMatchObject({
      name: "Shipping Recipient",
      email: "profile@example.com",
      phone: "3105550199",
      address1: "123 Ocean Ave",
      address2: "Unit 4",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      memo: "Leave at door"
    });
  });
});
