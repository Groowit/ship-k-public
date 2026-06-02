import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { checkoutOrderRequestSchema } from "@/lib/checkout-input";
import { createPayPalOrder } from "@/lib/paypal";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { findProductBySlug } from "@/lib/commerce-store";
import { assertProductCanCheckout, getProductCheckoutSummary } from "@/lib/products";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentUser();
    const body = checkoutOrderRequestSchema.parse(await request.json());
    const product = await findProductBySlug(body.productSlug);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    assertProductCanCheckout(product, body.quantity);
    const totals = getProductCheckoutSummary(product, body.quantity);
    const order = await createPayPalOrder({
      value: (totals.totalCents / 100).toFixed(2),
      currencyCode: "USD",
      description: `${product.name} x ${body.quantity}`,
      customId: `${product.slug}:${body.quantity}`
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
