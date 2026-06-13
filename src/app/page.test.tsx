/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { listActiveProducts } from "@/lib/commerce-store";
import { listHomeBanners } from "@/lib/home-banners";
import type { Product } from "@/lib/products";

vi.mock("@/components/home-feature-banner", () => ({
  HomeFeatureBanner: ({ banners }: { banners: unknown[] }) => (
    <div data-testid="home-feature-banner">{JSON.stringify(banners)}</div>
  )
}));

vi.mock("@/components/product-card", () => ({
  ProductCard: () => <div data-testid="product-card" />
}));

vi.mock("@/lib/commerce-store", () => ({
  listActiveProducts: vi.fn()
}));

vi.mock("@/lib/home-banners", () => ({
  listHomeBanners: vi.fn()
}));

vi.mock("@/lib/home-merchandising", () => ({
  getHomeMerchandisingProducts: () => ({
    trendingProducts: [],
    popularProducts: []
  })
}));

describe("HomePage banners", () => {
  it("renders managed home banners before product fallback banners", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([productFixture()] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([
      {
        id: "banner_1",
        topic: "ADMIN",
        headline: "Managed banner",
        description: "Controlled by admin",
        backgroundImagePath: "/managed-bg.png",
        linkPath: "/products/managed",
        fontKey: "brand-display",
        textColor: "black",
        topicTextColor: "shipk-pink",
        headlineTextColor: "white",
        descriptionTextColor: "teal",
        sortOrder: 1
      }
    ] as never);

    render(await HomePage());

    const payload = screen.getByTestId("home-feature-banner").textContent ?? "";
    expect(payload).toContain("Managed banner");
    expect(payload).toContain("topicTextColor");
    expect(payload).toContain("headlineTextColor");
    expect(payload).toContain("descriptionTextColor");
    expect(payload).not.toContain("Build a dewy set in one day");
  });

  it("falls back to products when no managed banners exist", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([productFixture()] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([] as never);

    render(await HomePage());

    const payload = screen.getByTestId("home-feature-banner").textContent ?? "";
    expect(payload).toContain("Build a dewy set in one day");
    expect(payload).toContain("/products/glow-set");
  });
});

function productFixture(overrides: Partial<Product> = {}): Product {
  return {
    id: "product_1",
    slug: "glow-set",
    productType: "set",
    brandName: "Glow Brand",
    name: "Glow Set",
    category: "Skincare",
    difficulty: "Beginner",
    itemCount: 1,
    shortDescription: "기존 요약",
    description: "기존 상세 본문",
    bestFor: "아침 루틴",
    result: "촉촉한 마무리",
    heroImagePath: "/hero.png",
    badges: [],
    tags: ["SKINCARE", "SET"],
    status: "active",
    updatedAt: "2026-05-28T00:00:00.000Z",
    option: {
      id: "option_1",
      name: "Default option",
      sku: "GLOW-SET",
      priceCents: 4900,
      stockQuantity: 10
    },
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: [],
    detailSections: [],
    ...overrides
  };
}
