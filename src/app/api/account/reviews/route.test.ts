import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import {
  ReviewConflictError,
  createProductReview
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
    createProductReview: vi.fn()
  };
});

describe("POST /api/account/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSameOriginRequest).mockImplementation(() => undefined);
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "user_1" },
      profile: null
    } as never);
    vi.mocked(createProductReview).mockResolvedValue({ id: "review_1" } as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await POST(formRequest({ rating: "5", orderItemId: "item_1" }));

    expect(response.status).toBe(401);
    expect(createProductReview).not.toHaveBeenCalled();
  });

  it("blocks unsafe origins before auth and store calls", async () => {
    vi.mocked(assertSameOriginRequest).mockImplementation(() => {
      throw new UnsafeRequestOriginError();
    });

    const response = await POST(formRequest({ rating: "5", orderItemId: "item_1" }));

    expect(response.status).toBe(403);
    expect(requireCurrentUser).not.toHaveBeenCalled();
    expect(createProductReview).not.toHaveBeenCalled();
  });

  it("rejects invalid ratings", async () => {
    const response = await POST(formRequest({ rating: "6", orderItemId: "item_1" }));

    expect(response.status).toBe(400);
    expect(createProductReview).not.toHaveBeenCalled();
  });

  it("creates a rating-only review", async () => {
    const response = await POST(formRequest({ rating: "5", orderItemId: "item_1" }));

    expect(response.status).toBe(200);
    expect(createProductReview).toHaveBeenCalledWith({
      userId: "user_1",
      orderItemId: "item_1",
      rating: 5,
      body: null,
      imageFiles: []
    });
  });

  it("maps duplicate order-item reviews to conflict", async () => {
    vi.mocked(createProductReview).mockRejectedValue(new ReviewConflictError());

    const response = await POST(formRequest({ rating: "5", orderItemId: "item_1" }));

    expect(response.status).toBe(409);
  });
});

function formRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  return new Request("https://shipk.test/api/account/reviews", {
    method: "POST",
    body: form
  });
}
