import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import {
  HomeBannerOrderError,
  HomeBannerSetupRequiredError,
  createHomeBanner,
  deleteHomeBanner,
  listAdminHomeBanners,
  reorderHomeBanners,
  updateHomeBanner
} from "@/lib/home-banners";
import { DELETE, PATCH as PATCH_BANNER } from "./[id]/route";
import { GET, POST } from "./route";
import { PATCH as PATCH_REORDER } from "./reorder/route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/home-banners", async () => {
  const actual = await vi.importActual<typeof import("@/lib/home-banners")>("@/lib/home-banners");
  return {
    ...actual,
    createHomeBanner: vi.fn(),
    deleteHomeBanner: vi.fn(),
    listAdminHomeBanners: vi.fn(),
    reorderHomeBanners: vi.fn(),
    updateHomeBanner: vi.fn()
  };
});

const banner = {
  id: "banner_1",
  topic: "TODAY",
  headline: "Fresh home focus",
  description: "Home banner body",
  backgroundImagePath: "/background.png",
  linkPath: "/shop",
  fontKey: "brand-display",
  textColor: "black",
  sortOrder: 1
};

describe("admin banner API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(listAdminHomeBanners).mockResolvedValue([banner] as never);
    vi.mocked(createHomeBanner).mockResolvedValue(banner as never);
    vi.mocked(updateHomeBanner).mockResolvedValue({ ...banner, headline: "Updated" } as never);
    vi.mocked(deleteHomeBanner).mockResolvedValue([] as never);
    vi.mocked(reorderHomeBanners).mockResolvedValue([banner] as never);
  });

  it("blocks unauthenticated banner list requests", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AuthRequiredError());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listAdminHomeBanners).not.toHaveBeenCalled();
  });

  it("returns setup-required when the banner table is missing", async () => {
    vi.mocked(listAdminHomeBanners).mockRejectedValue(new HomeBannerSetupRequiredError());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/Home banner table is not ready/);
  });

  it("creates banners through the admin store", async () => {
    const payload = {
      topic: "TODAY",
      headline: "Fresh home focus",
      description: "Home banner body",
      backgroundImagePath: "/background.png",
      linkPath: "/shop",
      fontKey: "brand-display",
      textColor: "black"
    };

    const response = await POST(jsonRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.banner).toEqual(banner);
    expect(createHomeBanner).toHaveBeenCalledWith(payload);
  });

  it("blocks unsafe origins before banner creation auth or store calls", async () => {
    const response = await POST(jsonRequest(banner, { origin: "https://evil.test" }));

    expect(response.status).toBe(403);
    expect(requireCurrentAdmin).not.toHaveBeenCalled();
    expect(createHomeBanner).not.toHaveBeenCalled();
  });

  it("updates a selected banner id", async () => {
    const updateResponse = await PATCH_BANNER(jsonRequest({ ...banner, headline: "Updated" }), {
      params: Promise.resolve({ id: "banner_1" })
    });

    expect(updateResponse.status).toBe(200);
    expect(updateHomeBanner).toHaveBeenCalledWith("banner_1", expect.objectContaining({ headline: "Updated" }));
  });

  it("deletes a selected banner id", async () => {
    const deleteResponse = await DELETE(new Request("http://test.local/api/admin/banners/banner_1"), {
      params: Promise.resolve({ id: "banner_1" })
    });

    expect(deleteResponse.status).toBe(200);
    expect(deleteHomeBanner).toHaveBeenCalledWith("banner_1");
  });

  it("blocks unsafe origins before banner update, delete, and reorder work", async () => {
    const headers = { origin: "https://evil.test" };

    const updateResponse = await PATCH_BANNER(jsonRequest(banner, headers), {
      params: Promise.resolve({ id: "banner_1" })
    });
    const deleteResponse = await DELETE(
      new Request("http://test.local/api/admin/banners/banner_1", { headers }),
      { params: Promise.resolve({ id: "banner_1" }) }
    );
    const reorderResponse = await PATCH_REORDER(jsonRequest({ ids: ["banner_1"] }, headers));

    expect(updateResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(reorderResponse.status).toBe(403);
    expect(updateHomeBanner).not.toHaveBeenCalled();
    expect(deleteHomeBanner).not.toHaveBeenCalled();
    expect(reorderHomeBanners).not.toHaveBeenCalled();
  });

  it("returns reorder validation errors as bad requests", async () => {
    vi.mocked(reorderHomeBanners).mockRejectedValue(new HomeBannerOrderError("Banner reorder payload contains duplicates"));

    const response = await PATCH_REORDER(jsonRequest({ ids: ["banner_1", "banner_1"] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/duplicates/);
  });
});

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test.local/api/admin/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}
