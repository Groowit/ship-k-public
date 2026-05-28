import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { createBrandPartner, listAdminBrands } from "@/lib/brand-store";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  createBrandPartner: vi.fn(),
  listAdminBrands: vi.fn()
}));

describe("admin brands API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(listAdminBrands).mockResolvedValue([]);
    vi.mocked(createBrandPartner).mockResolvedValue({
      id: "brand_1",
      name: "Glow Brand",
      slug: "glow-brand",
      status: "active"
    } as never);
  });

  it("blocks non-admin brand creation", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await POST(jsonRequest({ name: "Glow Brand" }));

    expect(response.status).toBe(403);
    expect(createBrandPartner).not.toHaveBeenCalled();
  });

  it("lists brands for admins", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(listAdminBrands).toHaveBeenCalled();
  });

  it("creates brands for admins", async () => {
    const response = await POST(jsonRequest({ name: "Glow Brand", contactEmail: "owner@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.brand).toMatchObject({ id: "brand_1" });
    expect(createBrandPartner).toHaveBeenCalledWith({
      name: "Glow Brand",
      slug: undefined,
      contactEmail: "owner@example.com"
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
