import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { ReviewNotFoundError, toggleReviewHelpfulVote } from "@/lib/reviews-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const { id } = await params;
    const result = await toggleReviewHelpfulVote({ userId: user.id, reviewId: id });

    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof UnsafeRequestOriginError ||
      error instanceof ReviewNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update helpful vote" },
      { status: 400 }
    );
  }
}
