import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth";
import { reorderHomeCurationEntries } from "@/lib/home-curation";
import { assertSameOriginRequest } from "@/lib/request-guard";
import { adminHomeCurationErrorResponse } from "../error-response";

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const body = await request.json();
    const entries = await reorderHomeCurationEntries(body.ids);
    return NextResponse.json({ entries });
  } catch (error) {
    return adminHomeCurationErrorResponse(error, "Could not reorder home curation entries");
  }
}
