import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordReferralClick } from "@/lib/commerce-store";
import { POST } from "./route";

vi.mock("@/lib/commerce-store", () => ({
  recordReferralClick: vi.fn()
}));

describe("referral click capture API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recordReferralClick).mockResolvedValue({
      recorded: true
    });
  });

  it("records valid ref and link click payloads", async () => {
    const response = await POST(
      jsonRequest({
        referralCode: "jamie-abc123",
        linkToken: "linktoken123",
        landingPath: "/products/daily-glow",
        anonymousId: "visitor_123456"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      recorded: true
    });
    expect(recordReferralClick).toHaveBeenCalledWith({
      referralCode: "jamie-abc123",
      linkToken: "linktoken123",
      landingPath: "/products/daily-glow",
      anonymousId: "visitor_123456"
    });
  });

  it("fails closed for invalid click payloads", async () => {
    const response = await POST(
      jsonRequest({ referralCode: "jamie-abc123", landingPath: "/products/daily-glow" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ recorded: false });
    expect(recordReferralClick).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/referrals/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
