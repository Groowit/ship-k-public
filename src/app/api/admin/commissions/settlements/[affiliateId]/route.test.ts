import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { payUnpaidAffiliateCommissions } from "@/lib/commerce-store";
import { PATCH } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  payUnpaidAffiliateCommissions: vi.fn()
}));

describe("admin affiliate commission settlement API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: {} as never,
      profile: null
    });
    vi.mocked(payUnpaidAffiliateCommissions).mockResolvedValue(undefined);
  });

  it("blocks non-admin settlement updates", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await PATCH(jsonRequest({ status: "paid" }), {
      params: Promise.resolve({ affiliateId: "affiliate_1" })
    });

    expect(response.status).toBe(403);
    expect(payUnpaidAffiliateCommissions).not.toHaveBeenCalled();
  });

  it("marks all unpaid affiliate commissions as paid for admins", async () => {
    const response = await PATCH(jsonRequest({ status: "paid" }), {
      params: Promise.resolve({ affiliateId: "affiliate_1" })
    });

    expect(response.status).toBe(200);
    expect(payUnpaidAffiliateCommissions).toHaveBeenCalledWith({
      affiliateId: "affiliate_1"
    });
  });

  it("blocks cross-origin settlement updates", async () => {
    const response = await PATCH(
      jsonRequest({ status: "paid" }, { origin: "https://attacker.test" }),
      {
        params: Promise.resolve({ affiliateId: "affiliate_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(payUnpaidAffiliateCommissions).not.toHaveBeenCalled();
  });

  it("rejects non-payment settlement updates", async () => {
    const response = await PATCH(jsonRequest({ status: "cancelled" }), {
      params: Promise.resolve({ affiliateId: "affiliate_1" })
    });

    expect(response.status).toBe(400);
    expect(payUnpaidAffiliateCommissions).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown, headers?: HeadersInit) {
  return new Request("http://test.local/api/admin/commissions/settlements/affiliate_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}
