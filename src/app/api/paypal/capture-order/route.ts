import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { checkoutCaptureRequestSchema } from "@/lib/checkout-input";
import { capturePayPalOrder } from "@/lib/paypal";
import {
  REFERRAL_COOKIE_NAME,
  isReferralAttributionExpired,
  parseReferralAttribution
} from "@/lib/referral";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  createPaidOrder,
  findCheckoutSessionForCapture,
  findProductBySlug,
  getCheckoutSessionCustomId
} from "@/lib/commerce-store";
import { assertProductCanCheckout, getProductCheckoutSummary } from "@/lib/products";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const body = checkoutCaptureRequestSchema.parse(await request.json());
    const product = await findProductBySlug(body.productSlug);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    assertProductCanCheckout(product, body.quantity);
    const totals = getProductCheckoutSummary(product, body.quantity);
    const capture = await capturePayPalOrder(body.orderID);
    const capturedCustomId = getPayPalCaptureCustomId(capture);
    const checkoutSession = await findCheckoutSessionForCapture({
      userId: user.id,
      providerOrderId: body.orderID,
      expectedCustomId: capturedCustomId ?? "",
      productId: product.id,
      quantity: body.quantity,
      totalCents: totals.totalCents
    });

    if (!checkoutSession) {
      throw new Error("Checkout session does not match PayPal capture");
    }

    assertCapturedOrderMatchesCheckout(capture, {
      customId: getCheckoutSessionCustomId(checkoutSession),
      value: (totals.totalCents / 100).toFixed(2),
      currencyCode: "USD"
    });
    const cookieStore = await cookies();
    const attribution = await parseReferralAttribution(
      cookieStore.get(REFERRAL_COOKIE_NAME)?.value
    );
    const referralCode =
      attribution && !isReferralAttributionExpired(attribution)
        ? attribution.code
        : undefined;
    const referralLinkToken =
      attribution && !isReferralAttributionExpired(attribution)
        ? attribution.linkToken
        : undefined;
    const referralLandingPath =
      attribution && !isReferralAttributionExpired(attribution)
        ? attribution.landingPath
        : undefined;
    const paymentCapture = getFirstPayPalCapture(capture);
    const order = await createPaidOrder({
      userId: user.id,
      product,
      quantity: body.quantity,
      shippingAddress: body.shippingAddress,
      paymentProviderOrderId: body.orderID,
      paymentProviderCaptureId: paymentCapture?.id,
      paymentStatus: paymentCapture?.status ?? capture.status ?? "COMPLETED",
      paymentPayload: capture,
      referralCode,
      referralLinkToken,
      referralLandingPath
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      capture
    });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof UnsafeRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid capture request" },
      { status: 400 }
    );
  }
}

function getPayPalCaptureCustomId(capture: {
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        custom_id?: string;
      }>;
    };
  }>;
}) {
  const purchaseUnit = capture.purchase_units?.[0];
  return purchaseUnit?.payments?.captures?.[0]?.custom_id ?? purchaseUnit?.custom_id ?? null;
}

function getFirstPayPalCapture(capture: {
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
      }>;
    };
  }>;
}) {
  return capture.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
}

function assertCapturedOrderMatchesCheckout(
  capture: {
    status?: string;
    purchase_units?: Array<{
      custom_id?: string;
      amount?: {
        currency_code?: string;
        value?: string;
      };
      payments?: {
        captures?: Array<{
          status?: string;
          custom_id?: string;
          amount?: {
            currency_code?: string;
            value?: string;
          };
        }>;
      };
    }>;
  },
  expected: {
    customId: string;
    value: string;
    currencyCode: "USD";
  }
) {
  const purchaseUnit = capture.purchase_units?.[0];
  const paymentCapture = purchaseUnit?.payments?.captures?.[0];
  const customId = paymentCapture?.custom_id ?? purchaseUnit?.custom_id;
  const amount = paymentCapture?.amount ?? purchaseUnit?.amount;

  if (capture.status !== "COMPLETED" || paymentCapture?.status !== "COMPLETED") {
    throw new Error("PayPal capture is not completed");
  }
  if (customId !== expected.customId) {
    throw new Error("PayPal capture does not match checkout item");
  }
  if (
    amount?.currency_code !== expected.currencyCode ||
    amount.value !== expected.value
  ) {
    throw new Error("PayPal capture amount does not match checkout total");
  }
}
