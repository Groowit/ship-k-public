import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { CommissionStatusUpdateError, updateCommissionStatus } from "@/lib/commerce-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const commissionStatusSchema = z.object({
  status: z.enum(["paid", "cancelled"])
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = commissionStatusSchema.parse(await request.json());
    await updateCommissionStatus({ commissionId: id, status: body.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CommissionStatusUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update commission" },
      { status: 400 }
    );
  }
}
