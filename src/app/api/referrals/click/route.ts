import { NextResponse } from "next/server";
import { z } from "zod";
import { recordReferralClick } from "@/lib/commerce-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const referralClickSchema = z.object({
  referralCode: z.string().min(3).max(64),
  linkToken: z.string().min(8).max(96),
  landingPath: z.string().min(1).max(512),
  anonymousId: z.string().min(8).max(128).optional()
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const body = referralClickSchema.parse(await request.json());
    const result = await recordReferralClick({
      referralCode: body.referralCode,
      linkToken: body.linkToken,
      landingPath: body.landingPath,
      anonymousId: body.anonymousId
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnsafeRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ recorded: false });
  }
}
