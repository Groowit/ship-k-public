import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { getUploadImageExtension, validateUploadImageFile } from "@/lib/image-upload";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { createSupabasePrivilegedClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireCurrentAdmin();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const imageError = await validateUploadImageFile(file);
    if (imageError) {
      return NextResponse.json({ error: imageError }, { status: 400 });
    }

    const extension = getUploadImageExtension(file);
    const path = `admin/banners/${Date.now()}-${getSafeFileStem(file.name)}.${extension}`;
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
      error instanceof AdminRequiredError ||
      error instanceof UnsafeRequestOriginError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload banner image" },
      { status: 400 }
    );
  }
}

function getSafeFileStem(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "home-banner"
  );
}
