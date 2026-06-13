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

describe("admin banner image upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: {} as never,
      profile: null
    });
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.ship-k.test/product-images/admin/banners/hero.png" }
    });
    from.mockReturnValue({ upload, getPublicUrl });
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({
      storage: { from }
    } as never);
  });

  it("blocks non-admin uploads", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await POST(uploadRequest(testFile(pngBytes(), "hero.png", "image/png")));

    expect(response.status).toBe(403);
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });

  it("uploads banner images under the admin banner storage prefix", async () => {
    const response = await POST(uploadRequest(testFile(webpBytes(), "Home Banner.webp", "image/webp")));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("product-images");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^admin\/banners\/\d+-home-banner\.webp$/),
      expect.any(File),
      { contentType: "image/webp", upsert: false }
    );
    expect(body.publicUrl).toBe("https://cdn.ship-k.test/product-images/admin/banners/hero.png");
  });

  it("blocks unsafe origins before upload auth or storage calls", async () => {
    const response = await POST(
      uploadRequest(testFile(pngBytes(), "hero.png", "image/png"), {
        origin: "https://evil.test"
      })
    );

    expect(response.status).toBe(403);
    expect(requireCurrentAdmin).not.toHaveBeenCalled();
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });

  it("rejects spoofed image uploads before storage is touched", async () => {
    const response = await POST(
      uploadRequest(testFile(textBytes("<svg onload=alert(1)>"), "hero.png", "image/png"))
    );

    expect(response.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
});

function uploadRequest(file: File, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.append("file", file);
  const request = new Request("http://test.local/api/admin/banner-images", {
    method: "POST",
    headers
  });

  vi.spyOn(request, "formData").mockResolvedValue(form);
  return request;
}

function testFile(bytes: ArrayBuffer, name: string, type: string) {
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => bytes
  });
  return file;
}

function textBytes(value: string) {
  return new TextEncoder().encode(value).buffer;
}

function pngBytes() {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
}

function webpBytes() {
  return new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46,
    0x00,
    0x00,
    0x00,
    0x00,
    0x57,
    0x45,
    0x42,
    0x50
  ]).buffer;
}
