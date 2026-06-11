import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { AuthRequiredError, requireCurrentUser } from "@/lib/auth";
import {
  BrandProductNotFoundError
} from "@/lib/brand-store";
import { listBrandProductReviewsForUser } from "@/lib/reviews-store";

vi.mock("@/lib/auth", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    status = 401;
    constructor() {
      super("Authentication required");
    }
  },
  requireCurrentUser: vi.fn()
}));

vi.mock("@/lib/brand-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/brand-store")>("@/lib/brand-store");
  return actual;
});

vi.mock("@/lib/reviews-store", () => ({
  listBrandProductReviewsForUser: vi.fn()
}));

describe("GET /api/brand/products/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      user: { id: "brand_user_1" },
      profile: null
    } as never);
    vi.mocked(listBrandProductReviewsForUser).mockResolvedValue({
      reviews: [],
      summary: { count: 0, averageRating: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      sort: "newest",
      total: 0
    });
  });

  it("requires a logged-in brand user", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await GET(request(), params());

    expect(response.status).toBe(401);
    expect(listBrandProductReviewsForUser).not.toHaveBeenCalled();
  });

  it("returns assigned product reviews read-only", async () => {
    const response = await GET(request(), params());

    expect(response.status).toBe(200);
    expect(listBrandProductReviewsForUser).toHaveBeenCalledWith({
      userId: "brand_user_1",
      productId: "product_1"
    });
  });

  it("does not leak wrong-brand product reviews", async () => {
    vi.mocked(listBrandProductReviewsForUser).mockRejectedValue(new BrandProductNotFoundError());

    const response = await GET(request(), params());

    expect(response.status).toBe(404);
  });
});

function request() {
  return new Request("https://shipk.test/api/brand/products/product_1/reviews");
}

function params() {
  return { params: Promise.resolve({ id: "product_1" }) };
}
