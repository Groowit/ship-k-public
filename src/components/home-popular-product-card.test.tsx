/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePopularProductCard } from "./home-popular-product-card";
import type { Product } from "@/lib/products";

describe("HomePopularProductCard", () => {
  it("renders a compact product card with the requested product details", () => {
    render(<HomePopularProductCard product={productFixture()} />);

    expect(screen.getByRole("link", { name: /Glow Set/i })).toHaveAttribute(
      "href",
      "/products/glow-set"
    );
    expect(screen.getByAltText("Glow Set product")).toBeVisible();
    expect(screen.getByText("Glow Brand")).toBeVisible();
    expect(screen.getByText("Glow Set")).toBeVisible();
    expect(screen.getByText("기존 요약")).toBeVisible();
    expect(screen.getByText("$49.00")).toBeVisible();
    expect(screen.queryByText("Beginner")).not.toBeInTheDocument();
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
