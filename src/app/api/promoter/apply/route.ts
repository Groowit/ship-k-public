import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { applyForPromoter } from "@/lib/commerce-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const applySchema = z.object({
  termsAccepted: z.literal(true)
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    applySchema.parse(await request.json());
    const { user, profile } = await requireCurrentUser();
    const affiliate = await applyForPromoter({
      userId: user.id,
      email: profile?.email ?? user.email ?? `${user.id}@auth.local`,
      fullName: profile?.fullName
    });

    return NextResponse.json({ affiliate });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof UnsafeRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not apply as promoter" },
      { status: 400 }
    );
  }
}
