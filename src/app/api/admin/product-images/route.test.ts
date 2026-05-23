import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { createSupabasePrivilegedClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createSupabasePrivilegedClient: vi.fn()
}));

const upload = vi.fn();
const getPublicUrl = vi.fn();
const from = vi.fn();

describe("admin product image upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: {} as never,
      profile: null
    });
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.ship-k.test/product-images/admin/hero.png" }
    });
    from.mockReturnValue({ upload, getPublicUrl });
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({
      storage: { from }
    } as never);
  });

  it("blocks non-admin uploads", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await POST(uploadRequest(new File(["image"], "hero.png", { type: "image/png" })));

    expect(response.status).toBe(403);
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });

  it("uploads supported images to the product-images bucket and returns a public URL", async () => {
    const response = await POST(uploadRequest(new File(["image"], "Hero Image.webp", { type: "image/webp" })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("product-images");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^admin\/\d+-hero-image\.webp$/),
      expect.any(File),
      { contentType: "image/webp", upsert: false }
    );
    expect(body.publicUrl).toBe("https://cdn.ship-k.test/product-images/admin/hero.png");
  });

  it("rejects unsupported upload types before storage is touched", async () => {
    const response = await POST(uploadRequest(new File(["movie"], "intro.mp4", { type: "video/mp4" })));

    expect(response.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
});

function uploadRequest(file: File) {
  const form = new FormData();
  form.append("file", file);
  const request = new Request("http://test.local/api/admin/product-images", {
    method: "POST"
  });

  vi.spyOn(request, "formData").mockResolvedValue(form);
  return request;
}
