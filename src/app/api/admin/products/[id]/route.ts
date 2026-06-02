import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { adminProductPayloadSchema } from "@/lib/admin-product-input";
import { syncProductBrandAssignmentForProduct } from "@/lib/brand-store";
import { toCents } from "@/lib/commerce";
import { archiveProduct, updateProduct } from "@/lib/commerce-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const admin = await requireCurrentAdmin();
    const { id } = await params;
    const rawBody = await request.json();
    const hasBrandAssignmentInput = hasOwnKey(rawBody, "brandPartnerId");
    const body = adminProductPayloadSchema.parse(rawBody);
    const product = await updateProduct(id, {
      productType: body.productType,
      brandName: body.brandName,
      name: body.name,
      category: body.category,
      tags: body.tags,
      difficulty: body.difficulty,
      itemCount: body.itemCount,
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
      detailSections: body.detailSections,
      detailActorId: admin.user.id,
      status: body.status
    });

    if (hasBrandAssignmentInput) {
      await syncProductBrandAssignmentForProduct({
        productId: product.id,
        brandId: body.brandPartnerId ?? null,
        canEditDetails: body.canEditDetails,
        assignedBy: admin.user.id
      });
    }

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

function hasOwnKey(value: unknown, key: string) {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key));
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
