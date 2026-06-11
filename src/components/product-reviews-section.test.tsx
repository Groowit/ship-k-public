/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { ProductReviewsSection } from "./product-reviews-section";
import type { ProductReviewsPayload } from "@/lib/reviews-shared";

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    void fill;
    void unoptimized;
    return <img alt={alt ?? ""} {...props} />;
  }
}));

describe("ProductReviewsSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits a rating-only verified-purchase review", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          review: { id: "review_created", orderItemId: "item_1" }
        })
      )
      .mockResolvedValueOnce(jsonResponse(payloadWithOwnerReviewOnly("review_created", "item_1")));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={emptyPayload()}
        eligibility={{
          canReview: true,
          items: [
            {
              orderId: "order_1",
              orderItemId: "item_1",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1001",
              orderStatus: "paid",
              existingReviewDeleted: false,
              canReview: true
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Write a review$/i }));
    fireEvent.submit(screen.getByRole("button", { name: /Post review/i }).closest("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/reviews", expect.objectContaining({ method: "POST" }));
    });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get("orderItemId")).toBe("item_1");
    expect(form.get("rating")).toBe("5");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Post review/i })).not.toBeInTheDocument();
    });
  });

  it("lets repeat purchasers review another eligible order item", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ review: { id: "review_created" } }))
      .mockResolvedValueOnce(jsonResponse(payloadWithViewerReview()));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithViewerReview()}
        eligibility={{
          canReview: true,
          items: [
            {
              orderId: "order_2",
              orderItemId: "item_2",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1002",
              orderStatus: "paid",
              existingReviewDeleted: false,
              canReview: true
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    expect(screen.getByRole("button", { name: /^Write a review$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Write a review$/i }));
    fireEvent.submit(screen.getByRole("button", { name: /Post review/i }).closest("form")!);

    await waitFor(() => {
      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get("orderItemId")).toBe("item_2");
    });
  });

  it("shows hidden owner reviews for author edit and delete even when they are not public", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithHiddenOwnerReview()}
        eligibility={{
          canReview: false,
          items: [
            {
              orderId: "order_1",
              orderItemId: "item_1",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1001",
              orderStatus: "paid",
              existingReviewId: "review_hidden",
              existingReviewDeleted: false,
              canReview: false
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    expect(screen.getByText("Your reviews")).toBeInTheDocument();
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByText("Hidden owner review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Write a review$/i })).not.toBeInTheDocument();
  });

  it("fetches sorted reviews and toggles helpful state", async () => {
    const sortedPayload = {
      ...payloadWithReview(),
      reviews: [
        {
          ...payloadWithReview().reviews[0],
          id: "review_sorted",
          body: "Sorted review"
        }
      ],
      sort: "newest"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(sortedPayload))
      .mockResolvedValueOnce(jsonResponse({ helpfulCount: 2, voted: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithReview()}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: "Newest" }));
    await screen.findAllByText("Sorted review");

    fireEvent.click(screen.getByRole("button", { name: "Helpful 0" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/reviews/review_sorted/helpful", { method: "POST" });
    });
    expect(await screen.findByRole("button", { name: "Helpful 2" })).toBeInTheDocument();
  });

  it("submits the star rating selected with the visual star control", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ review: { id: "review_created", orderItemId: "item_1" } }))
      .mockResolvedValueOnce(jsonResponse(payloadWithOwnerReviewOnly("review_created", "item_1")));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={emptyPayload()}
        eligibility={{
          canReview: true,
          items: [
            {
              orderId: "order_1",
              orderItemId: "item_1",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1001",
              orderStatus: "paid",
              existingReviewDeleted: false,
              canReview: true
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Write a review$/i }));
    fireEvent.click(screen.getByRole("radio", { name: "3 stars" }));
    fireEvent.submit(screen.getByRole("button", { name: /Post review/i }).closest("form")!);

    await waitFor(() => {
      const form = fetchMock.mock.calls[0][1].body as FormData;
      expect(form.get("rating")).toBe("3");
    });
  });

  it("renders the star rating picker without large tinted star backgrounds", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={emptyPayload()}
        eligibility={{
          canReview: true,
          items: [
            {
              orderId: "order_1",
              orderItemId: "item_1",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1001",
              orderStatus: "paid",
              existingReviewDeleted: false,
              canReview: true
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Write a review$/i }));

    expect(screen.getByRole("radiogroup", { name: "Rating" }).className).not.toContain("border");
    screen.getAllByRole("radio").forEach((starButton) => {
      expect(starButton.className).not.toContain("bg-[#fff8d7]");
    });
  });

  it("keeps the review body field fixed-size instead of user-resizable", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={emptyPayload()}
        eligibility={{
          canReview: true,
          items: [
            {
              orderId: "order_1",
              orderItemId: "item_1",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1001",
              orderStatus: "paid",
              existingReviewDeleted: false,
              canReview: true
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Write a review$/i }));

    const textarea = screen.getByPlaceholderText(/Share what stood out/i);
    expect(textarea).toHaveClass("h-40");
    expect(textarea).toHaveClass("resize-none");
    expect(textarea).toHaveClass("overflow-y-auto");
  });

  it("opens review photos in a large review photo dialog", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithPhotoReview()}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Open review photo 1 from Buyer/i }));

    expect(screen.getByRole("dialog", { name: "Review photo" })).toBeInTheDocument();
    expect(screen.getByAltText("Review photo 1 from Buyer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close review photo" }));
    expect(screen.queryByRole("dialog", { name: "Review photo" })).not.toBeInTheDocument();
  });

  it("navigates between review photos inside the photo dialog", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithPhotoReview()}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Open review photo 1 from Buyer/i }));

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByAltText("Review photo 1 from Buyer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next review photo" }));

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByAltText("Review photo 2 from Buyer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous review photo" }));

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByAltText("Review photo 1 from Buyer")).toBeInTheDocument();
  });

  it("uses photo dialog thumbnails for direct photo navigation", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithPhotoReview()}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Open review photo 1 from Buyer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Show review photo 2" }));

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByAltText("Review photo 2 from Buyer")).toBeInTheDocument();
  });

  it("keeps up to five review photos in a single horizontal row", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithPhotoReview(5)}
        isAuthenticated={false}
      />
    );

    const photoRow = screen.getByTestId("review-photo-row-review_1");
    expect(photoRow).toHaveClass("flex");
    expect(photoRow).toHaveClass("overflow-x-auto");
    expect(photoRow).not.toHaveClass("grid");
    expect(screen.getByRole("button", { name: /Open review photo 5 from Buyer/i })).toBeInTheDocument();
  });

  it("limits selected review upload photos to five in the form UI", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={emptyPayload()}
        eligibility={{
          canReview: true,
          items: [
            {
              orderId: "order_1",
              orderItemId: "item_1",
              productId: "product_1",
              productName: "Glow Set",
              orderNumber: "SK-1001",
              orderStatus: "paid",
              existingReviewDeleted: false,
              canReview: true
            }
          ]
        }}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^Write a review$/i }));

    const files = Array.from({ length: 6 }, (_, index) =>
      new File(["review photo"], `photo-${index + 1}.jpg`, { type: "image/jpeg" })
    );
    const photoInput = document.querySelector('input[name="photos"]') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files } });

    expect(screen.getByText("5 photos selected")).toBeInTheDocument();
    expect(screen.getByText("Only the first 5 photos will be attached.")).toBeInTheDocument();
    expect(screen.getByText("photo-5.jpg")).toBeInTheDocument();
    expect(screen.queryByText("photo-6.jpg")).not.toBeInTheDocument();
  });

  it("shows an inline sign-in prompt beside helpful votes for anonymous users", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithReview()}
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign in to mark helpful/i }));

    expect(screen.getByText("Sign in to mark this review helpful.")).toBeInTheDocument();
  });

  it("asks authors to confirm before deleting a review", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payloadWithViewerReview()));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithViewerReview()}
        isAuthenticated
        viewerId="user_1"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("dialog", { name: "Delete review?" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete review" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/reviews/review_viewer_1", { method: "DELETE" });
    });
  });

  it("shows a nonblank fallback when review photos cannot load", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithPhotoReview()}
        isAuthenticated={false}
      />
    );

    fireEvent.error(screen.getAllByAltText("Review photo")[0]);

    expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
  });

  it("keeps the product-detail entry compact and jumps to detailed reviews on request", () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithManyReviews()}
        isAuthenticated={false}
      />
    );

    expect(screen.getAllByText("Loved it 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Loved it 3").length).toBeGreaterThan(0);
    expect(screen.getByText("Loved it 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review details" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Read all 4 reviews" }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Show fewer reviews" })).not.toBeInTheDocument();
  });

  it("treats unreadable review text as a rating-only review in the public UI", () => {
    render(
      <ProductReviewsSection
        productId="product_1"
        productName="Glow Set"
        initialPayload={payloadWithUnreadableReview()}
        isAuthenticated={false}
      />
    );

    expect(screen.queryByText("ㄹㅁㅇㄹㄷ")).not.toBeInTheDocument();
    expect(screen.getAllByText("Rating only").length).toBeGreaterThan(0);
    expect(screen.queryByText("Rating-only review.")).not.toBeInTheDocument();
  });
});

function emptyPayload(): ProductReviewsPayload {
  return {
    reviews: [],
    ownerReviews: [],
    summary: { count: 0, averageRating: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    sort: "popular",
    total: 0
  };
}

function payloadWithReview(): ProductReviewsPayload {
  return {
    reviews: [
      {
        id: "review_1",
        productId: "product_1",
        orderId: "order_1",
        orderItemId: "item_1",
        profileId: "user_2",
        rating: 5,
        body: "Loved it",
        status: "visible",
        helpfulCount: 0,
        helpfulByViewer: false,
        hasImages: false,
        authorName: "Buyer",
        verifiedPurchase: true,
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
        images: []
      }
    ],
    ownerReviews: [],
    summary: { count: 1, averageRating: 5, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    sort: "popular",
    total: 1
  };
}

function payloadWithPhotoReview(imageCount = 2): ProductReviewsPayload {
  const review = {
    ...payloadWithReview().reviews[0],
    images: Array.from({ length: imageCount }, (_, index) => ({
      id: `image_${index + 1}`,
      imagePath: `reviews/product_1/review_1/photo-${index + 1}.jpg`,
      publicUrl: `https://example.com/review-photo-${index + 1}.jpg`,
      sortOrder: index + 1
    })),
    hasImages: true
  };

  return {
    reviews: [review],
    ownerReviews: [],
    summary: { count: 1, averageRating: 5, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    sort: "popular",
    total: 1
  };
}

function payloadWithManyReviews(): ProductReviewsPayload {
  const baseReview = payloadWithReview().reviews[0];
  const reviews = [1, 2, 3, 4].map((index) => ({
    ...baseReview,
    id: `review_${index}`,
    body: `Loved it ${index}`,
    createdAt: `2026-06-1${index}T00:00:00.000Z`,
    updatedAt: `2026-06-1${index}T00:00:00.000Z`
  }));

  return {
    reviews,
    ownerReviews: [],
    summary: { count: 4, averageRating: 5, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 4 } },
    sort: "popular",
    total: 4
  };
}

function payloadWithUnreadableReview(): ProductReviewsPayload {
  const review = {
    ...payloadWithReview().reviews[0],
    body: "ㄹㅁㅇㄹㄷ"
  };

  return {
    reviews: [review],
    ownerReviews: [],
    summary: { count: 1, averageRating: 5, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    sort: "popular",
    total: 1
  };
}

function payloadWithOwnerReviewOnly(reviewId: string, orderItemId: string): ProductReviewsPayload {
  return {
    ...emptyPayload(),
    ownerReviews: [
      {
        ...payloadWithReview().reviews[0],
        id: reviewId,
        profileId: "user_1",
        orderItemId,
        body: "Fresh owner review"
      }
    ]
  };
}

function payloadWithViewerReview(): ProductReviewsPayload {
  const payload = payloadWithReview();
  return {
    ...payload,
    ownerReviews: [
      {
        ...payload.reviews[0],
        id: "review_viewer_1",
        profileId: "user_1",
        orderItemId: "item_1"
      }
    ],
    reviews: [
      {
        ...payload.reviews[0],
        id: "review_viewer_1",
        profileId: "user_1",
        orderItemId: "item_1"
      }
    ]
  };
}

function payloadWithHiddenOwnerReview(): ProductReviewsPayload {
  return {
    ...emptyPayload(),
    ownerReviews: [
      {
        ...payloadWithReview().reviews[0],
        id: "review_hidden",
        profileId: "user_1",
        orderItemId: "item_1",
        status: "hidden",
        body: "Hidden owner review",
        hiddenAt: "2026-06-10T01:00:00.000Z",
        hiddenReason: "Admin review"
      }
    ]
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init
  });
}
