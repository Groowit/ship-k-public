import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { BrandInputError, assignProductToBrand, updateProductBrandAssignment } from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const assignProductSchema = z.object({
  productId: z.string().trim().min(1)
});

const updateAssignmentSchema = z.object({
  assignmentId: z.string().trim().min(1),
  status: z.enum(["active", "paused", "archived"]),
  canEditDetails: z.boolean()
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = updateAssignmentSchema.parse(await request.json());
    const assignment = await updateProductBrandAssignment({
      brandId: id,
      assignmentId: body.assignmentId,
      status: body.status,
      canEditDetails: body.canEditDetails
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
