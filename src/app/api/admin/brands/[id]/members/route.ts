import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { BrandInputError, connectBrandMember, updateBrandMembership } from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const connectMemberSchema = z.object({
  email: z.string().trim().email(),
  memberRole: z.enum(["owner", "editor", "viewer"]).default("editor")
});

const updateMemberSchema = z.object({
  membershipId: z.string().trim().min(1),
  memberRole: z.enum(["owner", "editor", "viewer"]),
  status: z.enum(["active", "paused"])
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = connectMemberSchema.parse(await request.json());
    const membership = await connectBrandMember({
      brandId: id,
      email: body.email,
      memberRole: body.memberRole
    });

    return NextResponse.json({ membership });
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
      { error: error instanceof Error ? error.message : "Invalid brand member request" },
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
    const body = updateMemberSchema.parse(await request.json());
    const membership = await updateBrandMembership({
      brandId: id,
      membershipId: body.membershipId,
      memberRole: body.memberRole,
      status: body.status
    });

    return NextResponse.json({ membership });
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
      { error: error instanceof Error ? error.message : "Invalid brand member request" },
      { status: 400 }
    );
  }
}
