import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getReviewEligibilityForProduct,
  listProductReviews,
  normalizeReviewBody,
  normalizeReviewSort,
  updateProductReview,
  validateReviewRating
} from "./reviews-store";
import { createSupabasePrivilegedClient } from "./supabase/admin";

vi.mock("./supabase/admin", () => ({
  createSupabasePrivilegedClient: vi.fn()
}));

describe("reviews-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates required rating and optional body", () => {
    expect(validateReviewRating("5")).toBe(5);
    expect(normalizeReviewBody("   ")).toBeNull();
    expect(normalizeReviewBody("  Great  ")).toBe("Great");
    expect(normalizeReviewSort("photo_first")).toBe("photo_first");
    expect(normalizeReviewSort("unknown")).toBe("popular");
    expect(() => validateReviewRating("0")).toThrow("Rating must be an integer");
    expect(() => validateReviewRating("4.5")).toThrow("Rating must be an integer");
    expect(() => normalizeReviewBody("x".repeat(5001))).toThrow("5000");
  });

  it("computes public summary and popular sort from visible rows", async () => {
    const rows = [
      reviewRow({
        id: "review_b",
        rating: 5,
        created_at: "2026-06-10T10:00:00.000Z",
        product_review_helpful_votes: [{ profile_id: "u1" }]
      }),
      reviewRow({
        id: "review_a",
        rating: 3,
        created_at: "2026-06-10T11:00:00.000Z",
        product_review_helpful_votes: [{ profile_id: "u2" }, { profile_id: "u3" }]
      }),
      reviewRow({
        id: "review_c",
        rating: 4,
        created_at: "2026-06-10T12:00:00.000Z",
        product_review_helpful_votes: [{ profile_id: "u4" }, { profile_id: "u5" }]
      })
    ];
    const reviewsQuery = createQueryResult(rows);
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(createClient({
      products: createQueryResult({ id: "product_1", status: "active" }),
      product_reviews: reviewsQuery
    }) as never);

    const payload = await listProductReviews({
      productId: "product_1",
      sort: "popular",
      viewerId: "u4"
    });

    expect(payload.summary).toMatchObject({
      count: 3,
      averageRating: 4
    });
    expect(payload.reviews.map((review) => review.id)).toEqual(["review_c", "review_a", "review_b"]);
    expect(payload.reviews[0].helpfulByViewer).toBe(true);
    expect(reviewsQuery.eq).toHaveBeenCalledWith("status", "visible");
    expect(reviewsQuery.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("returns no public reviews for inactive products even when visible rows exist", async () => {
    const productReviewsQuery = createQueryResult([reviewRow()]);
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      createClient({
        products: createQueryResult({ id: "product_1", status: "draft" }),
        product_reviews: productReviewsQuery
      }) as never
    );

    const payload = await listProductReviews({ productId: "product_1" });

    expect(payload.reviews).toEqual([]);
    expect(payload.summary.count).toBe(0);
    expect(productReviewsQuery.select).not.toHaveBeenCalled();
  });

  it("puts photo and text reviews first for the corresponding sorts", async () => {
    const rows = [
      reviewRow({ id: "plain", body: null }),
      reviewRow({
        id: "photo",
        body: null,
        product_review_images: [
          { id: "image_1", image_path: "reviews/a.jpg", public_url: "https://img/a.jpg", sort_order: 1 }
        ]
      }),
      reviewRow({ id: "text", body: "Helpful notes", created_at: "2026-06-10T10:00:00.000Z" })
    ];
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      createClient({
        products: createQueryResult({ id: "product_1", status: "active" }),
        product_reviews: createQueryResult(rows)
      }) as never
    );

    await expect(
      listProductReviews({ productId: "product_1", sort: "photo_first" }).then((payload) =>
        payload.reviews.map((review) => review.id)
      )
    ).resolves.toEqual(["photo", "text", "plain"]);

    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      createClient({
        products: createQueryResult({ id: "product_1", status: "active" }),
        product_reviews: createQueryResult(rows)
      }) as never
    );
    await expect(
      listProductReviews({ productId: "product_1", sort: "text_first" }).then((payload) =>
        payload.reviews.map((review) => review.id)
      )
    ).resolves.toEqual(["text", "plain", "photo"]);
  });

  it("rejects pending and unpaid cancelled order items for review eligibility", async () => {
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      createClient({
        orders: createQueryResult([
          orderRow({
            status: "pending_payment",
            payment_transactions: [{ status: "COMPLETED", provider_capture_id: "cap_1" }]
          }),
          orderRow({
            id: "order_cancelled",
            status: "cancelled",
            order_number: "SK-CANCELLED",
            order_items: [{ id: "item_cancelled", product_id: "product_1", product_name: "Glow Set" }],
            payment_transactions: []
          })
        ]),
        product_reviews: createQueryResult([])
      }) as never
    );

    const eligibility = await getReviewEligibilityForProduct({
      userId: "user_1",
      productId: "product_1"
    });

    expect(eligibility.canReview).toBe(false);
    expect(eligibility.items).toHaveLength(2);
  });

  it("allows paid-or-later order items only with completed payment evidence", async () => {
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      createClient({
        orders: createQueryResult([
          orderRow({
            status: "refunded",
            payment_transactions: [{ status: "COMPLETED", provider_capture_id: "cap_1" }]
          })
        ]),
        product_reviews: createQueryResult([])
      }) as never
    );

    const eligibility = await getReviewEligibilityForProduct({
      userId: "user_1",
      productId: "product_1"
    });

    expect(eligibility.canReview).toBe(true);
    expect(eligibility.items[0]).toMatchObject({
      canReview: true,
      orderStatus: "refunded"
    });
  });

  it("treats existing soft-deleted reviews as terminal for the same order item", async () => {
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      createClient({
        orders: createQueryResult([
          orderRow({
            payment_transactions: [{ status: "COMPLETED", provider_capture_id: "cap_1" }]
          })
        ]),
        product_reviews: createQueryResult([
          { id: "review_deleted", order_item_id: "item_1", deleted_at: "2026-06-10T00:00:00.000Z", status: "visible" }
        ])
      }) as never
    );

    const eligibility = await getReviewEligibilityForProduct({
      userId: "user_1",
      productId: "product_1"
    });

    expect(eligibility.canReview).toBe(false);
    expect(eligibility.items[0]).toMatchObject({
      existingReviewId: "review_deleted",
      existingReviewDeleted: true,
      canReview: false
    });
  });

  it("restores existing photo metadata when replacement image insert fails", async () => {
    const insertCalls: unknown[][] = [];
    const updateCalls: unknown[] = [];
    const deletedReviewIds: string[] = [];
    const removedPaths: string[][] = [];
    const previousImage = {
      id: "image_old",
      image_path: "reviews/product_1/review_1/1-old.png",
      public_url: "https://img/old.png",
      sort_order: 1
    };
    const client = {
      from: vi.fn((table: string) => {
        if (table === "product_reviews") {
          return createMutableReviewQuery(reviewRow({
            id: "review_1",
            product_id: "product_1",
            profile_id: "user_1",
            rating: 2,
            body: "Original body"
          }), updateCalls);
        }
        if (table === "product_review_images") {
          return createImageMutationQuery({
            previousImage,
            insertCalls,
            deletedReviewIds
          });
        }
        return createQueryResult([]);
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => Promise.resolve({ error: null })),
          remove: vi.fn((paths: string[]) => {
            removedPaths.push(paths);
            return Promise.resolve({ error: null });
          }),
          getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://img/${path}` } }))
        }))
      }
    };
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(client as never);
    const file = {
      name: "new.png",
      type: "image/png",
      size: 8,
      arrayBuffer: async () =>
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer
    } as File;

    await expect(
      updateProductReview({
        userId: "user_1",
        reviewId: "review_1",
        rating: 5,
        body: "Keep old photo if insert fails",
        imageFiles: [file],
        replaceImages: true
      })
    ).rejects.toThrow("Could not save review images");

    expect(deletedReviewIds).toEqual(["review_1", "review_1"]);
    expect(updateCalls).toEqual([
      {
        rating: 5,
        body: "Keep old photo if insert fails"
      },
      {
        rating: 2,
        body: "Original body"
      }
    ]);
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[1]).toEqual([
      {
        id: "image_old",
        review_id: "review_1",
        image_path: "reviews/product_1/review_1/1-old.png",
        public_url: "https://img/old.png",
        sort_order: 1
      }
    ]);
    expect(removedPaths.flat()).not.toContain(previousImage.image_path);
  });
});

function reviewRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "review_1",
    product_id: "product_1",
    order_id: "order_1",
    order_item_id: "item_1",
    profile_id: "user_1",
    rating: 5,
    body: "Nice",
    status: "visible",
    hidden_at: null,
    hidden_reason: null,
    deleted_at: null,
    created_at: "2026-06-10T09:00:00.000Z",
    updated_at: "2026-06-10T09:00:00.000Z",
    profiles: { full_name: "Buyer", email: "buyer@example.com" },
    product_review_images: [],
    product_review_helpful_votes: [],
    ...overrides
  };
}

function orderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order_1",
    status: "paid",
    order_number: "SK-1001",
    order_items: [{ id: "item_1", product_id: "product_1", product_name: "Glow Set" }],
    payment_transactions: [],
    ...overrides
  };
}

function createClient(queries: Record<string, ReturnType<typeof createQueryResult>>) {
  return {
    from: vi.fn((table: string) => queries[table] ?? createQueryResult([]))
  };
}

function createQueryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error })
    ),
    single: vi.fn(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error })
    ),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(resolve, reject)
  };

  return query;
}

function createMutableReviewQuery(row: unknown, updateCalls?: unknown[]) {
  const query = createQueryResult(row) as ReturnType<typeof createQueryResult> & {
    update: ReturnType<typeof vi.fn>;
  };
  query.update = vi.fn((payload: unknown) => {
    updateCalls?.push(payload);
    return query;
  });
  return query;
}

function createImageMutationQuery({
  previousImage,
  insertCalls,
  deletedReviewIds
}: {
  previousImage: unknown;
  insertCalls: unknown[][];
  deletedReviewIds: string[];
}) {
  let insertCount = 0;
  let pendingDelete = false;
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      if (pendingDelete && column === "review_id") {
        deletedReviewIds.push(value);
        pendingDelete = false;
      }
      return query;
    }),
    delete: vi.fn(() => {
      pendingDelete = true;
      return query;
    }),
    insert: vi.fn((rows: unknown[]) => {
      insertCalls.push(rows);
      insertCount += 1;
      return Promise.resolve({
        data: null,
        error: insertCount === 1 ? { message: "insert failed" } : null
      });
    }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data: [previousImage], error: null }).then(resolve, reject)
  };

  return query;
}
