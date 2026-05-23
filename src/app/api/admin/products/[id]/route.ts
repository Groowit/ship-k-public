import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { adminProductPayloadSchema } from "@/lib/admin-product-input";
import { toCents } from "@/lib/commerce";
import { archiveProduct, updateProduct } from "@/lib/mvp-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    const body = adminProductPayloadSchema.parse(await request.json());
    const product = await updateProduct(id, {
      productType: body.productType,
      brandName: body.brandName,
      name: body.name,
      category: body.category,
      collectionSlug: body.collectionSlug,
      difficulty: body.difficulty,
      itemCount: body.itemCount,
      themeLabel: body.themeLabel,
      shortDescription: body.shortDescription,
      description: body.description,
      bestFor: body.bestFor,
      result: body.result,
      optionName: body.optionName,
      sku: body.sku,
      priceCents: toCents(body.priceUsd),
      stockQuantity: body.stockQuantity,
      heroImagePath: body.heroImagePath,
      introVideoUrl: body.introVideoUrl,
      galleryImages: body.galleryImages,
      includedItems: body.includedItems,
      routineSteps: body.routineSteps,
      contentBlocks: body.contentBlocks,
      status: body.status
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid product request" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const { id } = await params;
    await archiveProduct(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not archive product" },
      { status: 400 }
    );
  }
}
