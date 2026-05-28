import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { updateAffiliateStatus } from "@/lib/commerce-store";
import { PATCH } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  updateAffiliateStatus: vi.fn()
}));

describe("admin affiliate status API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: {} as never,
      profile: null
    });
    vi.mocked(updateAffiliateStatus).mockResolvedValue(undefined);
  });

  it("blocks non-admin affiliate updates", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await PATCH(jsonRequest({ status: "blocked" }), {
      params: Promise.resolve({ id: "affiliate_1" })
    });

    expect(response.status).toBe(403);
    expect(updateAffiliateStatus).not.toHaveBeenCalled();
  });

  it("updates affiliate status for admins", async () => {
    const response = await PATCH(jsonRequest({ status: "paused" }), {
      params: Promise.resolve({ id: "affiliate_1" })
    });

    expect(response.status).toBe(200);
    expect(updateAffiliateStatus).toHaveBeenCalledWith({
      affiliateId: "affiliate_1",
      status: "paused"
    });
  });

  it("rejects invalid affiliate statuses", async () => {
    const response = await PATCH(jsonRequest({ status: "deleted" }), {
      params: Promise.resolve({ id: "affiliate_1" })
    });

    expect(response.status).toBe(400);
    expect(updateAffiliateStatus).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/affiliates/affiliate_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
