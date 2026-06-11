import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  ReviewForbiddenError,
  deleteProductReview,
  updateProductReview
} from "@/lib/reviews-store";

vi.mock("@/lib/auth", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    status = 401;
    constructor() {
      super("Authentication required");
    }
  },
  requireCurrentUser: vi.fn()
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
    deleteProductReview: vi.fn(),
    updateProductReview: vi.fn()
  };
});

describe("/api/account/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSameOriginRequest).mockImplementation(() => undefined);
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "user_1" },
      profile: null
    } as never);
    vi.mocked(updateProductReview).mockResolvedValue({ id: "review_1" } as never);
  });

  it("updates an author review with rating-only form data", async () => {
    const response = await PATCH(formRequest({ rating: "4", body: "" }), params());

    expect(response.status).toBe(200);
    expect(updateProductReview).toHaveBeenCalledWith({
      userId: "user_1",
      reviewId: "review_1",
      rating: 4,
      body: "",
      imageFiles: [],
      replaceImages: false
    });
  });

  it("rejects non-author update attempts", async () => {
    vi.mocked(updateProductReview).mockRejectedValue(new ReviewForbiddenError());

    const response = await PATCH(formRequest({ rating: "4" }), params());

    expect(response.status).toBe(403);
  });

  it("soft-deletes an author review", async () => {
    const response = await DELETE(formRequest({}), params());

    expect(response.status).toBe(200);
    expect(deleteProductReview).toHaveBeenCalledWith({
      userId: "user_1",
      reviewId: "review_1"
    });
  });

  it("requires auth before delete", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await DELETE(formRequest({}), params());

    expect(response.status).toBe(401);
    expect(deleteProductReview).not.toHaveBeenCalled();
  });

  it("blocks unsafe origins before owner mutation", async () => {
    vi.mocked(assertSameOriginRequest).mockImplementation(() => {
      throw new UnsafeRequestOriginError();
    });

    const response = await PATCH(formRequest({ rating: "4" }), params());

    expect(response.status).toBe(403);
    expect(requireCurrentUser).not.toHaveBeenCalled();
  });
});

function formRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new Request("https://shipk.test/api/account/reviews/review_1", {
    method: "PATCH",
    body: form
  });
}

function params() {
  return { params: Promise.resolve({ id: "review_1" }) };
}
