import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { payUnpaidAffiliateCommissions } from "@/lib/commerce-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const settlementStatusSchema = z.object({
  status: z.literal("paid")
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { affiliateId } = await params;
    settlementStatusSchema.parse(await request.json());
    await payUnpaidAffiliateCommissions({ affiliateId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update settlement" },
      { status: 400 }
    );
  }
}
