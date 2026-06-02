import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireCurrentAdmin } from "@/lib/auth";
import { connectBrandMember, updateBrandMembership } from "@/lib/brand-store";
import { PATCH, POST } from "./route";

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
  connectBrandMember: vi.fn(),
  updateBrandMembership: vi.fn()
}));

describe("admin brand members API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(connectBrandMember).mockResolvedValue({ id: "membership_1" } as never);
    vi.mocked(updateBrandMembership).mockResolvedValue({ id: "membership_1" } as never);
  });

  it("connects a customer account to a brand", async () => {
    const response = await POST(jsonRequest({ email: "owner@example.com", memberRole: "owner" }), {
      params: Promise.resolve({ id: "brand_1" })
    });

    expect(response.status).toBe(200);
    expect(connectBrandMember).toHaveBeenCalledWith({
      brandId: "brand_1",
      email: "owner@example.com",
      memberRole: "owner"
    });
  });

  it("updates member role and status for a brand", async () => {
    const response = await PATCH(
      jsonRequest({ membershipId: "membership_1", memberRole: "viewer", status: "paused" }),
      {
        params: Promise.resolve({ id: "brand_1" })
      }
    );

    expect(response.status).toBe(200);
    expect(updateBrandMembership).toHaveBeenCalledWith({
      brandId: "brand_1",
      membershipId: "membership_1",
      memberRole: "viewer",
      status: "paused"
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/brands/brand_1/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
