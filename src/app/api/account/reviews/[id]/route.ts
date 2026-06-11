import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  ReviewConflictError,
  ReviewForbiddenError,
  ReviewInputError,
  ReviewNotFoundError,
  deleteProductReview,
  updateProductReview,
  validateReviewRating
} from "@/lib/reviews-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const { id } = await params;
    const form = await request.formData();
    const rating = validateReviewRating(form.get("rating"));
    const body = form.get("body");
    const review = await updateProductReview({
      userId: user.id,
      reviewId: id,
      rating,
      body: typeof body === "string" ? body : null,
      imageFiles: getReviewFiles(form),
      replaceImages: form.get("replaceImages") === "true"
    });

    return NextResponse.json({ review });
  } catch (error) {
    return handleReviewMutationError(error, "Could not update review");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const { id } = await params;
    await deleteProductReview({ userId: user.id, reviewId: id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleReviewMutationError(error, "Could not delete review");
  }
}

function getReviewFiles(form: FormData) {
  return [...form.getAll("photos"), ...form.getAll("images")].filter(
    (value): value is File => value instanceof File && value.size > 0
  );
}

function handleReviewMutationError(error: unknown, fallback: string) {
  if (
    error instanceof AuthRequiredError ||
    error instanceof UnsafeRequestOriginError ||
    error instanceof ReviewInputError ||
    error instanceof ReviewForbiddenError ||
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
