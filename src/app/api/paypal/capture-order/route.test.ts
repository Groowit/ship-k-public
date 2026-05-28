import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { createPaidOrder, findProductBySlug } from "@/lib/commerce-store";
import { capturePayPalOrder } from "@/lib/paypal";
import { applyReferralClick, serializeReferralAttribution } from "@/lib/referral";
import { POST } from "./route";

vi.mock("next/headers", () => ({
  cookies: vi.fn()
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentUser: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  createPaidOrder: vi.fn(),
  findProductBySlug: vi.fn()
}));

vi.mock("@/lib/paypal", () => ({
  capturePayPalOrder: vi.fn()
}));

const product = {
  id: "product_1",
  slug: "daily-k-glow-set",
  name: "Daily K-Glow Set",
  option: {
    id: "option_1",
    name: "5-item routine kit",
    sku: "SK-DAILY",
    priceCents: 4_900,
    stockQuantity: 10
  }
};

const order = {
  id: "order_1",
  orderNumber: "SK123456",
  status: "paid"
};
const originalReferralSecret = process.env.REFERRAL_COOKIE_SECRET;

describe("PayPal capture API route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.REFERRAL_COOKIE_SECRET = "test-referral-cookie-secret-at-least-32-chars";
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "buyer_1" } as never,
      profile: null
    });
    vi.mocked(findProductBySlug).mockResolvedValue(product as never);
    vi.mocked(capturePayPalOrder).mockResolvedValue(captureResponse() as never);
    vi.mocked(createPaidOrder).mockResolvedValue(order as never);
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({
        value: await serializeReferralAttribution(
          applyReferralClick(
            null,
            "creator_code",
            "daily_glow_01",
            "/products/daily-k-glow-set",
            new Date()
          )
        )
      })
    } as never);
  });

  afterEach(() => {
    if (originalReferralSecret === undefined) {
      delete process.env.REFERRAL_COOKIE_SECRET;
    } else {
      process.env.REFERRAL_COOKIE_SECRET = originalReferralSecret;
    }
  });

  it("requires an authenticated buyer before capture", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(401);
    expect(capturePayPalOrder).not.toHaveBeenCalled();
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects cross-origin browser capture requests before auth", async () => {
    const response = await POST(
      jsonRequest(validPayload(), { origin: "https://attacker.example" })
    );

    expect(response.status).toBe(403);
    expect(requireCurrentUser).not.toHaveBeenCalled();
    expect(capturePayPalOrder).not.toHaveBeenCalled();
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("creates a paid order only after PayPal confirms matching completed capture details", async () => {
    const response = await POST(jsonRequest(validPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orderNumber).toBe("SK123456");
    expect(createPaidOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "buyer_1",
        product,
        quantity: 1,
        referralCode: "creator_code",
        referralLinkToken: "daily_glow_01",
        referralLandingPath: "/products/daily-k-glow-set"
      })
    );
  });

  it("rejects captures whose PayPal custom ID does not match the requested item", async () => {
    vi.mocked(capturePayPalOrder).mockResolvedValue(
      captureResponse({ customId: "other-product:1" }) as never
    );

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(400);
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects captures whose PayPal amount does not match the checkout total", async () => {
    vi.mocked(capturePayPalOrder).mockResolvedValue(
      captureResponse({ value: "1.00" }) as never
    );

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(400);
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects captures that are not completed", async () => {
    vi.mocked(capturePayPalOrder).mockResolvedValue(
      captureResponse({ orderStatus: "APPROVED" }) as never
    );

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(400);
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("ignores tampered referral cookies while still saving paid orders", async () => {
    const { cookies } = await import("next/headers");
    const signed = await serializeReferralAttribution(
      applyReferralClick(
        null,
        "creator_code",
        "daily_glow_01",
        "/products/daily-k-glow-set",
        new Date()
      )
    );
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({
        value: `${signed.slice(0, -1)}${signed.endsWith("a") ? "b" : "a"}`
      })
    } as never);

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(200);
    expect(createPaidOrder).toHaveBeenCalledWith(
      expect.not.objectContaining({
        referralCode: expect.any(String)
      })
    );
  });

  it("ignores expired referral cookies while still saving paid orders", async () => {
    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({
        value: await serializeReferralAttribution(
          applyReferralClick(
            null,
            "creator_code",
            "daily_glow_01",
            "/products/daily-k-glow-set",
            new Date("2026-05-01T00:00:00.000Z")
          )
        )
      })
    } as never);

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(200);
    expect(createPaidOrder).toHaveBeenCalledWith(
      expect.not.objectContaining({
        referralCode: expect.any(String)
      })
    );
  });
});

function validPayload() {
  return {
    orderID: "PAYPAL-ORDER-1",
    productSlug: "daily-k-glow-set",
    quantity: 1,
    shippingAddress: {
      name: "Jamie Park",
      email: "jamie@example.com",
      phone: "2135550144",
      address1: "123 Ocean Ave",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "US"
    }
  };
}

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test.local/api/paypal/capture-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

function captureResponse({
  orderStatus = "COMPLETED",
  captureStatus = "COMPLETED",
  customId = "daily-k-glow-set:1",
  value = "58.99"
}: {
  orderStatus?: string;
  captureStatus?: string;
  customId?: string;
  value?: string;
} = {}) {
  return {
    id: "PAYPAL-ORDER-1",
    status: orderStatus,
    purchase_units: [
      {
        custom_id: customId,
        amount: {
          currency_code: "USD",
          value
        },
        payments: {
          captures: [
            {
              id: "CAPTURE-1",
              status: captureStatus,
              custom_id: customId,
              amount: {
                currency_code: "USD",
                value
              }
            }
          ]
        }
      }
    ]
  };
}
