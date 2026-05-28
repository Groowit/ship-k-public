import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { connectBrandMember } from "@/lib/brand-store";
import { POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  connectBrandMember: vi.fn()
}));

describe("admin brand members API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(connectBrandMember).mockResolvedValue({
      id: "membership_1",
      brandId: "brand_1",
      profileId: "customer_1",
      memberRole: "editor",
      status: "active",
      email: "owner@example.com"
    } as never);
  });

  it("blocks non-admin member connection", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await POST(jsonRequest({ email: "owner@example.com" }), {
      params: Promise.resolve({ id: "brand_1" })
    });

    expect(response.status).toBe(403);
    expect(connectBrandMember).not.toHaveBeenCalled();
  });

  it("connects an existing customer profile without changing the profile role", async () => {
    const response = await POST(jsonRequest({ email: "owner@example.com", memberRole: "owner" }), {
      params: Promise.resolve({ id: "brand_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.membership).toMatchObject({ id: "membership_1" });
    expect(connectBrandMember).toHaveBeenCalledWith({
      brandId: "brand_1",
      email: "owner@example.com",
      memberRole: "owner"
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
