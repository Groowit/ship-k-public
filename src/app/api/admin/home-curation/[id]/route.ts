import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth";
import { deleteHomeCurationEntry } from "@/lib/home-curation";
import { assertSameOriginRequest } from "@/lib/request-guard";
import { adminHomeCurationErrorResponse } from "../error-response";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const entries = await deleteHomeCurationEntry(id);
    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    return adminHomeCurationErrorResponse(error, "Could not delete home curation entry");
  }
}
