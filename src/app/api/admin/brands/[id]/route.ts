import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { BrandInputError, updateBrandPartner } from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const updateBrandSchema = z.object({
  status: z.enum(["active", "paused", "archived"]).optional(),
  contactEmail: z.string().trim().email().nullable().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = updateBrandSchema.parse(await request.json());
    const brand = await updateBrandPartner({
      brandId: id,
      status: body.status,
      contactEmail: body.contactEmail
    });

    return NextResponse.json({ brand });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError ||
      error instanceof BrandInputError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid brand update request" },
      { status: 400 }
    );
  }
}
