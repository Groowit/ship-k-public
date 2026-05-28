import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { updateCommissionStatus } from "@/lib/commerce-store";
import { PATCH } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  updateCommissionStatus: vi.fn()
}));

describe("admin commission status API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: {} as never,
      profile: null
    });
    vi.mocked(updateCommissionStatus).mockResolvedValue(undefined);
  });

  it("blocks non-admin commission updates", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await PATCH(jsonRequest({ status: "paid" }), {
      params: Promise.resolve({ id: "commission_1" })
    });

    expect(response.status).toBe(403);
    expect(updateCommissionStatus).not.toHaveBeenCalled();
  });

  it("updates commission status for admins", async () => {
    const response = await PATCH(jsonRequest({ status: "approved" }), {
      params: Promise.resolve({ id: "commission_1" })
    });

    expect(response.status).toBe(200);
    expect(updateCommissionStatus).toHaveBeenCalledWith({
      commissionId: "commission_1",
      status: "approved"
    });
  });

  it("rejects invalid commission statuses", async () => {
    const response = await PATCH(jsonRequest({ status: "refunded" }), {
      params: Promise.resolve({ id: "commission_1" })
    });

    expect(response.status).toBe(400);
    expect(updateCommissionStatus).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/commissions/commission_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
