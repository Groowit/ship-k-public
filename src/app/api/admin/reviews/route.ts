import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { listAdminProductReviews } from "@/lib/reviews-store";

export async function GET(request: Request) {
  try {
    await requireCurrentAdmin();
    const url = new URL(request.url);
    const status = getStatusFilter(url.searchParams.get("status"));
    const reviews = await listAdminProductReviews({ status });

    return NextResponse.json({ reviews });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load reviews" },
      { status: 400 }
    );
  }
}

function getStatusFilter(raw: string | null) {
  if (raw === "visible" || raw === "hidden" || raw === "deleted") {
    return raw;
  }
  return "all";
}
