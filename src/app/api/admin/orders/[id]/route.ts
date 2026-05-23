import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { adminFulfillmentStatuses, fulfillmentCarriers } from "@/lib/fulfillment";
import { updateOrderFulfillment } from "@/lib/mvp-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const orderUpdateSchema = z.object({
  status: z.enum(adminFulfillmentStatuses),
  carrier: z.enum(fulfillmentCarriers).optional(),
  trackingNumber: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = orderUpdateSchema.parse(await request.json());
    const order = await updateOrderFulfillment({
      orderId: id,
      status: body.status,
      carrier: body.carrier,
      trackingNumber: body.trackingNumber
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid order request" },
      { status: 400 }
    );
  }
}
