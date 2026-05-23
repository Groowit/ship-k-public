import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { updateAffiliateStatus } from "@/lib/mvp-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const affiliateStatusSchema = z.object({
  status: z.enum(["active", "paused", "blocked"])
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = affiliateStatusSchema.parse(await request.json());
    await updateAffiliateStatus({ affiliateId: id, status: body.status });
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
      { error: error instanceof Error ? error.message : "Could not update affiliate" },
      { status: 400 }
    );
  }
}
