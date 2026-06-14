import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/auth";
import {
  createHomeCurationEntry,
  listAdminHomeCurationEntries
} from "@/lib/home-curation";
import { assertSameOriginRequest } from "@/lib/request-guard";
import { adminHomeCurationErrorResponse } from "./error-response";

export async function GET() {
  try {
    await requireCurrentAdmin();
    const entries = await listAdminHomeCurationEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    return adminHomeCurationErrorResponse(error, "Could not load home curation entries");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const entries = await createHomeCurationEntry(await request.json());
    return NextResponse.json({ entries });
  } catch (error) {
    return adminHomeCurationErrorResponse(error, "Could not create home curation entry");
  }
}
