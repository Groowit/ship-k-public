import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";
import { AdminRequiredError, AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { deleteProductReviewAsAdmin, hideProductReview } from "@/lib/reviews-store";

vi.mock("@/lib/auth", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    status = 401;
    constructor() {
      super("Authentication required");
    }
  },
  AdminRequiredError: class AdminRequiredError extends Error {
    status = 403;
    constructor() {
      super("Admin access required");
    }
  },
  requireCurrentAdmin: vi.fn()
}));

vi.mock("@/lib/request-guard", () => ({
  UnsafeRequestOriginError: class UnsafeRequestOriginError extends Error {
    status = 403;
    constructor() {
      super("Request origin is not allowed");
    }
  },
  assertSameOriginRequest: vi.fn()
}));

vi.mock("@/lib/reviews-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reviews-store")>("@/lib/reviews-store");
  return {
    ...actual,
    deleteProductReviewAsAdmin: vi.fn(),
    hideProductReview: vi.fn()
  };
});

describe("/api/admin/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSameOriginRequest).mockImplementation(() => undefined);
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" },
      profile: null
    } as never);
    vi.mocked(hideProductReview).mockResolvedValue({ id: "review_1", status: "hidden" } as never);
  });

  it("requires an admin for moderation", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await PATCH(jsonRequest({ hidden: true }), params());

    expect(response.status).toBe(403);
    expect(hideProductReview).not.toHaveBeenCalled();
  });

  it("blocks unsafe origins before admin actions", async () => {
    vi.mocked(assertSameOriginRequest).mockImplementation(() => {
      throw new UnsafeRequestOriginError();
    });

    const response = await PATCH(jsonRequest({ hidden: true }), params());

    expect(response.status).toBe(403);
    expect(requireCurrentAdmin).not.toHaveBeenCalled();
    expect(hideProductReview).not.toHaveBeenCalled();
  });

  it("hides or unhides a review", async () => {
    const response = await PATCH(jsonRequest({ hidden: true, reason: "spam" }), params());

    expect(response.status).toBe(200);
    expect(hideProductReview).toHaveBeenCalledWith({
      adminId: "admin_1",
      reviewId: "review_1",
      hidden: true,
      reason: "spam"
    });
  });

  it("soft-deletes a review as admin", async () => {
    const response = await DELETE(jsonRequest({}), params());

    expect(response.status).toBe(200);
    expect(deleteProductReviewAsAdmin).toHaveBeenCalledWith({
      adminId: "admin_1",
      reviewId: "review_1"
    });
  });

  it("maps unauthenticated admin access to 401", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AuthRequiredError());

    const response = await DELETE(jsonRequest({}), params());

    expect(response.status).toBe(401);
  });
});

function jsonRequest(body: unknown) {
  return new Request("https://shipk.test/api/admin/reviews/review_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function params() {
  return { params: Promise.resolve({ id: "review_1" }) };
}
