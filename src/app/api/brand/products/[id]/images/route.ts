import { NextResponse } from "next/server";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import {
  BrandAccessDeniedError,
  BrandProductNotFoundError,
  getBrandProductForUser
} from "@/lib/brand-store";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { createSupabasePrivilegedClient } from "@/lib/supabase/admin";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOriginRequest(request);
    const auth = await requireCurrentUser();
    const { id } = await params;
    const brandProduct = await getBrandProductForUser({
      userId: auth.user.id,
      productId: id,
      requireEditable: true
    });
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!allowedImageTypes.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    if (file.size > maxImageBytes) {
      return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const extension = getImageExtension(file);
    const path = `brand/${brandProduct.brand.slug}/${id}/${Date.now()}-${getSafeFileStem(file.name)}.${extension}`;
    const supabase = createSupabasePrivilegedClient();
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      contentType: file.type,
      upsert: false
    });

    if (error) {
      throw error;
    }

    const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ path, publicUrl });
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof UnsafeRequestOriginError ||
      error instanceof BrandAccessDeniedError ||
      error instanceof BrandProductNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload image" },
      { status: 400 }
    );
  }
}

function getImageExtension(file: File) {
  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "png";
}

function getSafeFileStem(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "brand-product"
  );
}
