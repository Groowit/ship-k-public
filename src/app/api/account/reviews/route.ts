import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  ReviewConflictError,
  ReviewForbiddenError,
  ReviewInputError,
  ReviewNotFoundError,
  createProductReview,
  validateReviewRating
} from "@/lib/reviews-store";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const form = await request.formData();
    const orderItemId = getRequiredString(form, "orderItemId");
    const rating = validateReviewRating(form.get("rating"));
    const body = form.get("body");
    const review = await createProductReview({
      userId: user.id,
      orderItemId,
      rating,
      body: typeof body === "string" ? body : null,
      imageFiles: getReviewFiles(form)
    });

    return NextResponse.json({ review });
  } catch (error) {
    return handleReviewMutationError(error, "Could not create review");
  }
}

function getRequiredString(form: FormData, key: string) {
  const value = form.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new ReviewInputError(`${key} is required`);
  }
  return value.trim();
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
