import { isPayPalMockEnabled } from "./env";

type PayPalAccessTokenResponse = {
  access_token: string;
};

export type PayPalCreateOrderInput = {
  value: string;
  currencyCode: "USD";
  description: string;
  customId: string;
};

type MockPayPalOrder = {
  value: string;
  currencyCode: "USD";
  customId: string;
};

const mockPayPalOrders = new Map<string, MockPayPalOrder>();

export async function createPayPalOrder(input: PayPalCreateOrderInput) {
  if (isPayPalMockEnabled()) {
    const mockOrder = {
      value: input.value,
      currencyCode: input.currencyCode,
      customId: input.customId
    };
    const id = `MOCK-${Date.now()}-${encodeMockPayPalOrder(mockOrder)}`;
    mockPayPalOrders.set(id, mockOrder);
    return {
      id,
      status: "CREATED"
    };
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.customId,
          description: input.description,
          amount: {
            currency_code: input.currencyCode,
            value: input.value
          }
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`PayPal create order failed: ${response.status}`);
  }

  return response.json() as Promise<{ id: string; status: string }>;
}

export async function capturePayPalOrder(orderId: string) {
  if (isPayPalMockEnabled()) {
    if (!isMockPayPalOrderId(orderId)) {
      throw new Error("Mock PayPal order id is required in mock mode");
    }

    const mockOrder = mockPayPalOrders.get(orderId) ?? decodeMockPayPalOrder(orderId);
    return {
      id: orderId,
      status: "COMPLETED",
      purchase_units: [
        {
          custom_id: mockOrder?.customId,
          amount: mockOrder
            ? {
                currency_code: mockOrder.currencyCode,
                value: mockOrder.value
              }
            : undefined,
          payments: {
            captures: [
              {
                id: `CAP-${Date.now()}`,
                status: "COMPLETED",
                custom_id: mockOrder?.customId,
                amount: mockOrder
                  ? {
                      currency_code: mockOrder.currencyCode,
                      value: mockOrder.value
                    }
                  : undefined
              }
            ]
          }
        }
      ]
    };
  }

  if (isMockPayPalOrderId(orderId)) {
    throw new Error("Mock PayPal order id is not accepted outside mock mode");
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(
    `${getPayPalApiBase()}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`PayPal capture failed: ${response.status}`);
  }

  return response.json();
}

function encodeMockPayPalOrder(order: MockPayPalOrder) {
  return Buffer.from(JSON.stringify(order), "utf8").toString("base64url");
}

function decodeMockPayPalOrder(orderId: string) {
  const encoded = /^MOCK-[^-]+-(.+)$/.exec(orderId)?.[1];
  if (!encoded) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as
      Partial<MockPayPalOrder>;
    if (
      typeof parsed.value !== "string" ||
      parsed.currencyCode !== "USD" ||
      typeof parsed.customId !== "string"
    ) {
      return undefined;
    }
    return {
      value: parsed.value,
      currencyCode: parsed.currencyCode,
      customId: parsed.customId
    };
  } catch {
    return undefined;
  }
}

function isMockPayPalOrderId(orderId: string) {
  return orderId.startsWith("MOCK-");
}

export async function verifyPayPalWebhook({
  transmissionId,
  transmissionTime,
  certUrl,
  authAlgo,
  transmissionSig,
  webhookEvent
}: {
  transmissionId: string | null;
  transmissionTime: string | null;
  certUrl: string | null;
  authAlgo: string | null;
  transmissionSig: string | null;
  webhookEvent: unknown;
}) {
  if (isPayPalMockEnabled()) {
    return { verification_status: "SUCCESS" };
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    throw new Error("PayPal webhook ID is not configured");
  }

  const accessToken = await getPayPalAccessToken();
  const response = await fetch(
    `${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: webhookEvent
      })
    }
  );

  if (!response.ok) {
    throw new Error(`PayPal webhook verification failed: ${response.status}`);
  }

  return response.json() as Promise<{ verification_status: string }>;
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured");
  }

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed: ${response.status}`);
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;
  return data.access_token;
}

function getPayPalApiBase() {
  const configured = process.env.PAYPAL_API_BASE?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PayPal API base is not configured");
  }

  return "https://api-m.sandbox.paypal.com";
}
