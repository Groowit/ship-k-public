import { NextResponse } from "next/server";
import { getCurrentAuthState } from "@/lib/auth";
import { listProductReviews, normalizeReviewSort } from "@/lib/reviews-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const sort = normalizeReviewSort(url.searchParams.get("sort"));
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const { user } = await getCurrentAuthState();
    const payload = await listProductReviews({
      productId: id,
      sort,
      viewerId: user?.id,
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load reviews" },
      { status: 400 }
    );
  }
}
