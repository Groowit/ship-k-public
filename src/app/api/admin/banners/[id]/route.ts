import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth";
import { deleteHomeBanner, updateHomeBanner } from "@/lib/home-banners";
import { assertSameOriginRequest } from "@/lib/request-guard";
import { adminBannerErrorResponse } from "../error-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const banner = await updateHomeBanner(id, await request.json());
    return NextResponse.json({ banner });
  } catch (error) {
    return adminBannerErrorResponse(error, "Could not update home banner");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const banners = await deleteHomeBanner(id);
    return NextResponse.json({ ok: true, banners });
  } catch (error) {
    return adminBannerErrorResponse(error, "Could not delete home banner");
  }
}
