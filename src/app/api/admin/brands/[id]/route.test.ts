import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { updateBrandPartner } from "@/lib/brand-store";
import { PATCH } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  BrandInputError: class BrandInputError extends Error {
    status = 400;
  },
  updateBrandPartner: vi.fn()
}));

describe("admin brand update API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(updateBrandPartner).mockResolvedValue({
      id: "brand_1",
      name: "Glow Brand",
      slug: "glow-brand",
      status: "paused",
      contactEmail: "owner@example.com"
    } as never);
  });

  it("blocks non-admin brand management changes", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await PATCH(jsonRequest({ status: "paused" }), {
      params: Promise.resolve({ id: "brand_1" })
    });

    expect(response.status).toBe(403);
    expect(updateBrandPartner).not.toHaveBeenCalled();
  });

  it("updates brand operating fields for admins", async () => {
    const response = await PATCH(jsonRequest({ status: "paused", contactEmail: "owner@example.com" }), {
      params: Promise.resolve({ id: "brand_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.brand).toMatchObject({ id: "brand_1", status: "paused" });
    expect(updateBrandPartner).toHaveBeenCalledWith({
      brandId: "brand_1",
      status: "paused",
      contactEmail: "owner@example.com"
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/brands/brand_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
