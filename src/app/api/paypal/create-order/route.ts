import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { createPayPalOrder } from "@/lib/paypal";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { findProductBySlug } from "@/lib/mvp-store";
import { getProductCheckoutSummary } from "@/lib/products";

const createOrderSchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.number().int().min(1).max(9),
  shippingAddress: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.literal("US"),
    memo: z.string().optional()
  })
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentUser();
    const body = createOrderSchema.parse(await request.json());
    const product = await findProductBySlug(body.productSlug);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
