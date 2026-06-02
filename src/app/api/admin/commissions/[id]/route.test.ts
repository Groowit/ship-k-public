import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { CommissionStatusUpdateError, updateCommissionStatus } from "@/lib/commerce-store";
import { PATCH } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  CommissionStatusUpdateError: class CommissionStatusUpdateError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 409) {
      super(message);
      this.statusCode = statusCode;
    }
  },
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
    const response = await PATCH(jsonRequest({ status: "paid" }), {
      params: Promise.resolve({ id: "commission_1" })
    });

    expect(response.status).toBe(200);
    expect(updateCommissionStatus).toHaveBeenCalledWith({
      commissionId: "commission_1",
      status: "paid"
    });
  });

  it("returns scoped commission status policy errors", async () => {
    vi.mocked(updateCommissionStatus).mockRejectedValue(
      new CommissionStatusUpdateError("지급 완료된 커미션은 상태를 변경할 수 없습니다.")
    );

    const response = await PATCH(jsonRequest({ status: "paid" }), {
      params: Promise.resolve({ id: "commission_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "지급 완료된 커미션은 상태를 변경할 수 없습니다." });
  });

  it("blocks cross-origin commission updates", async () => {
    const response = await PATCH(
      jsonRequest({ status: "paid" }, { origin: "https://attacker.test" }),
      {
        params: Promise.resolve({ id: "commission_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(updateCommissionStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid commission statuses", async () => {
    const response = await PATCH(jsonRequest({ status: "approved" }), {
      params: Promise.resolve({ id: "commission_1" })
    });

    expect(response.status).toBe(400);
    expect(updateCommissionStatus).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown, headers?: HeadersInit) {
  return new Request("http://test.local/api/admin/commissions/commission_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}
