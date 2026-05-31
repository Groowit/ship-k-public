import { afterEach, describe, expect, it, vi } from "vitest";

const originalPayPalMock = process.env.NEXT_PUBLIC_PAYPAL_MOCK;
const originalPayPalSecret = process.env.PAYPAL_CLIENT_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
const originalPayPalClientId = process.env.PAYPAL_CLIENT_ID;
const originalPayPalApiBase = process.env.PAYPAL_API_BASE;
const originalPayPalWebhookId = process.env.PAYPAL_WEBHOOK_ID;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  restoreEnv("NODE_ENV", originalNodeEnv);
  restoreEnv("NEXT_PUBLIC_PAYPAL_MOCK", originalPayPalMock);
  restoreEnv("PAYPAL_CLIENT_SECRET", originalPayPalSecret);
  restoreEnv("PAYPAL_CLIENT_ID", originalPayPalClientId);
  restoreEnv("PAYPAL_API_BASE", originalPayPalApiBase);
  restoreEnv("PAYPAL_WEBHOOK_ID", originalPayPalWebhookId);
});

describe("mock PayPal orders", () => {
  it("keeps checkout details available when capture runs after a module reload", async () => {
    process.env.NEXT_PUBLIC_PAYPAL_MOCK = "true";
    delete process.env.PAYPAL_CLIENT_SECRET;
    vi.resetModules();

    const { createPayPalOrder } = await import("./paypal");
    const order = await createPayPalOrder({
      value: "58.99",
      currencyCode: "USD",
      description: "Skincare Starter Set x 1",
      customId: "skincare-starter-set:1"
    });

    vi.resetModules();
    const { capturePayPalOrder } = await import("./paypal");
    const capture = await capturePayPalOrder(order.id);

    expect(capture.purchase_units?.[0]?.custom_id).toBe("skincare-starter-set:1");
    expect(capture.purchase_units?.[0]?.amount).toEqual({
      currency_code: "USD",
      value: "58.99"
    });
  });

  it("does not enable PayPal mock mode in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_PAYPAL_MOCK = "true";
    delete process.env.PAYPAL_CLIENT_SECRET;
    vi.resetModules();

    const { isPayPalMockEnabled } = await import("./env");

    expect(isPayPalMockEnabled()).toBe(false);
  });

  it("rejects mock order IDs outside mock mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_PAYPAL_MOCK = "false";
    process.env.PAYPAL_CLIENT_ID = "live-client";
    process.env.PAYPAL_CLIENT_SECRET = "live-secret";
    process.env.PAYPAL_API_BASE = "https://api-m.paypal.com";
    vi.resetModules();

    const { capturePayPalOrder } = await import("./paypal");

    await expect(
      capturePayPalOrder(
        "MOCK-1779510000000-eyJ2YWx1ZSI6IjU4Ljk5IiwiY3VycmVuY3lDb2RlIjoiVVNEIiwiY3VzdG9tSWQiOiJkYWlseS1rLWdsb3ctc2V0OjEifQ"
      )
    ).rejects.toThrow("Mock PayPal order id is not accepted outside mock mode");
  });

  it("fails closed when production webhook configuration is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_PAYPAL_MOCK = "false";
    process.env.PAYPAL_CLIENT_ID = "live-client";
    process.env.PAYPAL_CLIENT_SECRET = "live-secret";
    process.env.PAYPAL_API_BASE = "https://api-m.paypal.com";
    delete process.env.PAYPAL_WEBHOOK_ID;
    vi.resetModules();

    const { verifyPayPalWebhook } = await import("./paypal");

    await expect(
      verifyPayPalWebhook({
        transmissionId: "transmission",
        transmissionTime: "2026-05-23T00:00:00Z",
        certUrl: "https://api-m.paypal.com/cert",
        authAlgo: "SHA256withRSA",
        transmissionSig: "signature",
        webhookEvent: { id: "event" }
      })
    ).rejects.toThrow("PayPal webhook ID is not configured");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
