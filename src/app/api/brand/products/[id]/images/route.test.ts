import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { BrandProductNotFoundError, getBrandProductForUser } from "@/lib/brand-store";
import { createSupabasePrivilegedClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentUser: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  BrandAccessDeniedError: class BrandAccessDeniedError extends Error {
    status = 403;
  },
  BrandProductNotFoundError: class BrandProductNotFoundError extends Error {
    status = 404;
  },
  getBrandProductForUser: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabasePrivilegedClient: vi.fn()
}));

const upload = vi.fn();
const getPublicUrl = vi.fn();
const from = vi.fn();

describe("brand product image upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "brand_member_1" } as never,
      profile: null
    });
    vi.mocked(getBrandProductForUser).mockResolvedValue({
      product: { id: "product_1", name: "Glow Set" },
      brand: { id: "brand_1", slug: "glow-brand" },
      assignment: { id: "assignment_1" }
    } as never);
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.ship-k.test/product-images/brand/glow-brand/product_1/hero.png" }
    });
    from.mockReturnValue({ upload, getPublicUrl });
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({
      storage: { from }
    } as never);
  });

  it("blocks unauthenticated brand image uploads", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await POST(uploadRequest(new File(["image"], "hero.png", { type: "image/png" })), {
      params: Promise.resolve({ id: "product_1" })
    });

    expect(response.status).toBe(401);
    expect(getBrandProductForUser).not.toHaveBeenCalled();
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });

  it("blocks image uploads for products outside the member brand", async () => {
    vi.mocked(getBrandProductForUser).mockRejectedValue(new BrandProductNotFoundError());

    const response = await POST(uploadRequest(new File(["image"], "hero.png", { type: "image/png" })), {
      params: Promise.resolve({ id: "product_2" })
    });

    expect(response.status).toBe(404);
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });

  it("uploads supported product images under a brand-scoped path", async () => {
    const response = await POST(uploadRequest(new File(["image"], "Hero Image.webp", { type: "image/webp" })), {
      params: Promise.resolve({ id: "product_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("product-images");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^brand\/glow-brand\/product_1\/\d+-hero-image\.webp$/),
      expect.any(File),
      { contentType: "image/webp", upsert: false }
    );
    expect(body.publicUrl).toContain("product-images/brand/glow-brand/product_1/hero.png");
  });
});

function uploadRequest(file: File) {
  const form = new FormData();
  form.append("file", file);
  const request = new Request("http://test.local/api/brand/products/product_1/images", {
    method: "POST"
  });

  vi.spyOn(request, "formData").mockResolvedValue(form);
  return request;
}
