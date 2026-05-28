import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import {
  BrandInputError,
  createBrandPartner,
  listAdminBrands
} from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

const createBrandSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  contactEmail: z.string().trim().email().optional()
});

export async function GET() {
  try {
    await requireCurrentAdmin();
    const brands = await listAdminBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load brands" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const body = createBrandSchema.parse(await request.json());
    const brand = await createBrandPartner(body);

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
      { error: error instanceof Error ? error.message : "Invalid brand request" },
      { status: 400 }
    );
  }
}
