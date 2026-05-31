import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { brandProductContentPayloadSchema } from "@/lib/brand-product-input";
import {
  BrandAccessDeniedError,
  BrandInputError,
  BrandProductNotFoundError,
  updateBrandProductContentForUser
} from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const { user } = await requireCurrentUser();
    const { id } = await params;
    const input = brandProductContentPayloadSchema.parse(await request.json());
    const product = await updateBrandProductContentForUser({
      userId: user.id,
      productId: id,
      input
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof UnsafeRequestOriginError ||
      error instanceof BrandAccessDeniedError ||
      error instanceof BrandProductNotFoundError ||
      error instanceof BrandInputError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid brand product content request" },
      { status: 400 }
    );
  }
}
