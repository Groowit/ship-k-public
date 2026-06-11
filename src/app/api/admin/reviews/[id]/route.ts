import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  ReviewConflictError,
  ReviewInputError,
  ReviewNotFoundError,
  deleteProductReviewAsAdmin,
  hideProductReview
} from "@/lib/reviews-store";

const moderationSchema = z.object({
  hidden: z.boolean(),
  reason: z.string().optional().nullable()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentAdmin();
    const { id } = await params;
    const body = moderationSchema.parse(await request.json());
    const review = await hideProductReview({
      adminId: user.id,
      reviewId: id,
      hidden: body.hidden,
      reason: body.reason
    });

    return NextResponse.json({ review });
  } catch (error) {
    return handleAdminReviewError(error, "Could not moderate review");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentAdmin();
    const { id } = await params;
    await deleteProductReviewAsAdmin({ adminId: user.id, reviewId: id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAdminReviewError(error, "Could not delete review");
  }
}

function handleAdminReviewError(error: unknown, fallback: string) {
  if (
    error instanceof AuthRequiredError ||
    error instanceof AdminRequiredError ||
    error instanceof UnsafeRequestOriginError ||
    error instanceof ReviewInputError ||
    error instanceof ReviewNotFoundError ||
    error instanceof ReviewConflictError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 }
  );
}
