import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import { assertSameOriginRequest, UnsafeRequestOriginError } from "@/lib/request-guard";
import { ReviewNotFoundError, toggleReviewHelpfulVote } from "@/lib/reviews-store";

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
    toggleReviewHelpfulVote: vi.fn()
  };
});

describe("POST /api/reviews/[id]/helpful", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertSameOriginRequest).mockImplementation(() => undefined);
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "user_1" },
      profile: null
    } as never);
    vi.mocked(toggleReviewHelpfulVote).mockResolvedValue({
      helpfulCount: 3,
      voted: true
    });
  });

  it("requires authentication", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await POST(request(), params());

    expect(response.status).toBe(401);
    expect(toggleReviewHelpfulVote).not.toHaveBeenCalled();
  });

  it("blocks unsafe origins", async () => {
    vi.mocked(assertSameOriginRequest).mockImplementation(() => {
      throw new UnsafeRequestOriginError();
    });

    const response = await POST(request(), params());

    expect(response.status).toBe(403);
    expect(requireCurrentUser).not.toHaveBeenCalled();
  });

  it("toggles a helpful vote for a visible review", async () => {
    const response = await POST(request(), params());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ helpfulCount: 3, voted: true });
    expect(toggleReviewHelpfulVote).toHaveBeenCalledWith({
      userId: "user_1",
      reviewId: "review_1"
    });
  });

  it("does not vote on hidden or deleted reviews", async () => {
    vi.mocked(toggleReviewHelpfulVote).mockRejectedValue(new ReviewNotFoundError());

    const response = await POST(request(), params());

    expect(response.status).toBe(404);
  });
});

function request() {
  return new Request("https://shipk.test/api/reviews/review_1/helpful", { method: "POST" });
}

function params() {
  return { params: Promise.resolve({ id: "review_1" }) };
}
