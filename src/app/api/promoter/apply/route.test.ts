import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { applyForPromoter } from "@/lib/mvp-store";
import { POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentUser: vi.fn()
  };
});

vi.mock("@/lib/mvp-store", () => ({
  applyForPromoter: vi.fn()
}));

const affiliate = {
  id: "affiliate_1",
  code: "jamie-abc123",
  displayName: "Jamie Park",
  status: "active"
};

describe("promoter apply API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "user_1", email: "auth@example.com" } as never,
      profile: {
        id: "user_1",
        email: "jamie@example.com",
        fullName: "Jamie Park"
      } as never
    });
    vi.mocked(applyForPromoter).mockResolvedValue(affiliate as never);
  });

  it("requires an authenticated user before creating an affiliate profile", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await POST(jsonRequest({ termsAccepted: true }));

    expect(response.status).toBe(401);
    expect(applyForPromoter).not.toHaveBeenCalled();
  });

  it("rejects applications without explicit terms consent", async () => {
    const response = await POST(jsonRequest({ termsAccepted: false }));

    expect(response.status).toBe(400);
    expect(requireCurrentUser).not.toHaveBeenCalled();
    expect(applyForPromoter).not.toHaveBeenCalled();
  });

  it("creates an active self-service affiliate from the signed-in profile", async () => {
    const response = await POST(jsonRequest({ termsAccepted: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.affiliate).toEqual(affiliate);
    expect(applyForPromoter).toHaveBeenCalledWith({
      userId: "user_1",
      email: "jamie@example.com",
      fullName: "Jamie Park"
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/promoter/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
