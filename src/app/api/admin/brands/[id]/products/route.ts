import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { BrandInputError, assignProductToBrand } from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const assignProductSchema = z.object({
  productId: z.string().trim().min(1)
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const auth = await requireCurrentAdmin();
    const { id } = await params;
    const body = assignProductSchema.parse(await request.json());
    const assignment = await assignProductToBrand({
      brandId: id,
      productId: body.productId,
      assignedBy: auth.user.id
    });

    return NextResponse.json({ assignment });
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
      { error: error instanceof Error ? error.message : "Invalid brand product assignment request" },
      { status: 400 }
    );
  }
}
