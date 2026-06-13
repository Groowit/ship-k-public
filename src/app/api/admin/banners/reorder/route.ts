import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { HomeBannerOrderError, reorderHomeBanners } from "@/lib/home-banners";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const body = await request.json();
    const banners = await reorderHomeBanners(body.ids);
    return NextResponse.json({ banners });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof HomeBannerOrderError || error instanceof Error
            ? error.message
            : "Could not reorder home banners"
      },
      { status: 400 }
    );
  }
}
