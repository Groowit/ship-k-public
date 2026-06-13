import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth";
import { createHomeBanner, listAdminHomeBanners } from "@/lib/home-banners";
import { assertSameOriginRequest } from "@/lib/request-guard";
import { adminBannerErrorResponse } from "./error-response";

export async function GET() {
  try {
    await requireCurrentAdmin();
    const banners = await listAdminHomeBanners();
    return NextResponse.json({ banners });
  } catch (error) {
    return adminBannerErrorResponse(error, "Could not load home banners");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const banner = await createHomeBanner(await request.json());
    return NextResponse.json({ banner });
  } catch (error) {
    return adminBannerErrorResponse(error, "Could not create home banner");
  }
}
