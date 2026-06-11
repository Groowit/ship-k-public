import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { checkoutOrderRequestSchema } from "@/lib/checkout-input";
import { createPayPalOrder } from "@/lib/paypal";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  bindCheckoutSessionPayment,
  createCheckoutSession,
  findProductBySlug,
  getCheckoutSessionCustomId
} from "@/lib/commerce-store";
import { assertProductCanCheckout, getProductCheckoutSummary } from "@/lib/products";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const body = checkoutOrderRequestSchema.parse(await request.json());
    const product = await findProductBySlug(body.productSlug);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    assertProductCanCheckout(product, body.quantity);
    const totals = getProductCheckoutSummary(product, body.quantity);
    const checkoutSession = await createCheckoutSession({
      userId: user.id,
      productId: product.id,
      productSlug: product.slug,
      quantity: body.quantity,
      totalCents: totals.totalCents,
      currency: "USD"
    });
    const order = await createPayPalOrder({
      value: (totals.totalCents / 100).toFixed(2),
      currencyCode: "USD",
      description: `${product.name} x ${body.quantity}`,
      customId: getCheckoutSessionCustomId(checkoutSession)
    });

    await bindCheckoutSessionPayment({
      sessionId: checkoutSession.id,
      providerOrderId: order.id
    });

    return NextResponse.json({
      id: order.id,
      status: order.status,
      totals
    });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof UnsafeRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid checkout request" },
      { status: 400 }
    );
  }
}
