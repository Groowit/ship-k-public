import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import {
  bindCheckoutSessionPayment,
  createCheckoutSession,
  findProductBySlug
} from "@/lib/commerce-store";
import { createPayPalOrder } from "@/lib/paypal";
import { POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentUser: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  bindCheckoutSessionPayment: vi.fn(),
  createCheckoutSession: vi.fn(),
  findProductBySlug: vi.fn(),
  getCheckoutSessionCustomId: (session: { id: string; nonce: string }) =>
    `${session.id}:${session.nonce}`
}));

vi.mock("@/lib/paypal", () => ({
  createPayPalOrder: vi.fn()
}));

const product = {
  id: "product_1",
  slug: "skincare-starter-set",
  name: "Skincare Starter Set",
  option: {
    id: "option_1",
    name: "5-item set",
    sku: "SK-DAILY",
    priceCents: 4_900,
    stockQuantity: 10
  }
};

describe("PayPal create order API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "buyer_1" } as never,
      profile: null
    });
    vi.mocked(findProductBySlug).mockImplementation(async (slug) =>
      slug === "skincare-starter-set" ? (product as never) : undefined
    );
    vi.mocked(createPayPalOrder).mockResolvedValue({
      id: "PAYPAL-ORDER-1",
      status: "CREATED"
    } as never);
    vi.mocked(createCheckoutSession).mockResolvedValue({
      id: "checkout_session_1",
      nonce: "session_nonce_1"
    } as never);
    vi.mocked(bindCheckoutSessionPayment).mockResolvedValue(undefined);
  });

  it("requires an authenticated buyer before creating a PayPal order", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await POST(jsonRequest(validPayload()));

    expect(response.status).toBe(401);
    expect(findProductBySlug).not.toHaveBeenCalled();
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  it("rejects cross-origin browser order creation before auth", async () => {
    const response = await POST(
      jsonRequest(validPayload(), { origin: "https://attacker.example" })
    );

    expect(response.status).toBe(403);
    expect(requireCurrentUser).not.toHaveBeenCalled();
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  it("normalizes product slugs before building the PayPal order", async () => {
    const response = await POST(
      jsonRequest({
        ...validPayload(),
        productSlug: " Skincare-Starter-Set "
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("PAYPAL-ORDER-1");
    expect(findProductBySlug).toHaveBeenCalledWith("skincare-starter-set");
    expect(createPayPalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customId: "checkout_session_1:session_nonce_1",
        value: "58.99"
      })
    );
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "buyer_1",
        productId: "product_1",
        productSlug: "skincare-starter-set",
        quantity: 1,
        totalCents: 5899
      })
    );
    expect(bindCheckoutSessionPayment).toHaveBeenCalledWith({
      sessionId: "checkout_session_1",
      providerOrderId: "PAYPAL-ORDER-1"
    });
  });

  it("rejects whitespace-only required shipping fields before PayPal calls", async () => {
    const response = await POST(
      jsonRequest({
        ...validPayload(),
        shippingAddress: {
          ...validPayload().shippingAddress,
          name: "   "
        }
      })
    );

    expect(response.status).toBe(400);
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  it("accepts non-US shipping country labels instead of enforcing a US-only code", async () => {
    const response = await POST(
      jsonRequest({
        ...validPayload(),
        shippingAddress: {
          ...validPayload().shippingAddress,
          country: " United States "
        }
      })
    );

    expect(response.status).toBe(200);
    expect(createPayPalOrder).toHaveBeenCalled();
  });

  it("rejects checkout when requested quantity is above available stock", async () => {
    vi.mocked(findProductBySlug).mockResolvedValue({
      ...product,
      option: {
        ...product.option,
        stockQuantity: 1
      }
    } as never);

    const response = await POST(
      jsonRequest({
        ...validPayload(),
        quantity: 2
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/available stock/i);
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  it("rejects products without a positive checkout price before PayPal calls", async () => {
    vi.mocked(findProductBySlug).mockResolvedValue({
      ...product,
      option: {
        ...product.option,
        priceCents: 0
      }
    } as never);

    const response = await POST(jsonRequest(validPayload()));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/not available for checkout/i);
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });
});

function validPayload() {
  return {
    productSlug: "skincare-starter-set",
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
  return new Request("http://test.local/api/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}
