import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import {
  BrandAccessDeniedError,
  BrandProductNotFoundError
} from "@/lib/brand-store";
import { listBrandProductReviewsForUser } from "@/lib/reviews-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireCurrentUser();
    const { id } = await params;
    const payload = await listBrandProductReviewsForUser({ userId: user.id, productId: id });

    return NextResponse.json(payload);
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof BrandAccessDeniedError ||
      error instanceof BrandProductNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load brand reviews" },
      { status: 400 }
    );
  }
}
