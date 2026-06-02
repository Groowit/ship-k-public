import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { updateCustomerAccount } from "@/lib/commerce-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const defaultShippingAddressSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().trim().min(1).max(80),
  memo: z.string().optional()
});

const accountProfileSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  marketingOptIn: z.boolean(),
  defaultShippingAddress: defaultShippingAddressSchema
});

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const input = accountProfileSchema.parse(await request.json());
    const { user } = await requireCurrentUser();

    await updateCustomerAccount({
      userId: user.id,
      ...input
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof UnsafeRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save account details" },
      { status: 400 }
    );
  }
}
