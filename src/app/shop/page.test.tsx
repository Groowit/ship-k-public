/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ShopPage from "./page";
import { listActiveProducts } from "@/lib/commerce-store";
import type { Product } from "@/lib/products";

vi.mock("@/lib/commerce-store", () => ({
  listActiveProducts: vi.fn()
}));

describe("ShopPage", () => {
  it("renders a compact product grid without filter chrome or extra card metadata", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([
      productFixture({
        name: "Rice Cloud Cleanser",
        slug: "rice-cloud-cleanser",
        brandName: "Dew Lab",
        shortDescription: "Gentle daily cleanse for a soft start.",
        tags: ["CLEANSER", "DAILY"],
        badges: ["BESTSELLER"],
        itemCount: 5,
        difficulty: "Beginner",
        option: {
          id: "option_cleanser",
          name: "Default option",
          sku: "RICE-CLOUD",
          priceCents: 2400,
          stockQuantity: 10
        }
      })
    ] as never);

    render(await ShopPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /Skincare Sets/i })).toBeVisible();
    expect(screen.getByTestId("catalog-product-grid")).toHaveClass("grid-cols-3");
    expect(screen.getByTestId("catalog-product-grid")).toHaveClass("md:grid-cols-4");
    expect(screen.getByText("Dew Lab")).toBeVisible();
    expect(screen.getByText("Rice Cloud Cleanser")).toBeVisible();
    expect(screen.getByText("Gentle daily cleanse for a soft start.")).toBeVisible();
    expect(screen.getByText("$24.00")).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Product pages" })).toBeVisible();
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Previous product page")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.getByLabelText("Next product page")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.queryByRole("link", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByText("Face Cleansers")).not.toBeInTheDocument();
    expect(screen.queryByText("Face Serums")).not.toBeInTheDocument();
    expect(screen.queryByText("Moisturizers")).not.toBeInTheDocument();
    expect(screen.queryByText("Toners")).not.toBeInTheDocument();
    expect(screen.queryByText("Product filter")).not.toBeInTheDocument();
    expect(screen.queryByText(/products ready to ship/i)).not.toBeInTheDocument();
    expect(screen.queryByText("of 1")).not.toBeInTheDocument();
    expect(screen.queryByText("BESTSELLER")).not.toBeInTheDocument();
    expect(screen.queryByText("CLEANSER")).not.toBeInTheDocument();
    expect(screen.queryByText("5 items")).not.toBeInTheDocument();
    expect(screen.queryByText("Beginner")).not.toBeInTheDocument();
  });

  it("ignores hidden filter query state while the filter UI is absent", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([
      productFixture({
        id: "product_cleanser",
        name: "Cleanser Product",
        slug: "cleanser-product",
        includedItems: [
          {
            id: "included_cleanser",
            name: "Cleanser",
            category: "Cleanser",
            description: "Cleanser step"
          }
        ]
      }),
      productFixture({
        id: "product_toner",
        name: "Toner Product",
        slug: "toner-product",
        includedItems: [
          {
            id: "included_toner",
            name: "Toner",
            category: "Toner",
            description: "Toner step"
          }
        ]
      }),
      productFixture({
        id: "product_makeup",
        name: "Makeup Product",
        slug: "makeup-product",
        category: "Makeup"
      })
    ] as never);

    render(await ShopPage({ searchParams: Promise.resolve({ filter: "toners" }) }));

    expect(screen.getByText("Cleanser Product")).toBeVisible();
    expect(screen.getByText("Toner Product")).toBeVisible();
    expect(screen.queryByText("Makeup Product")).not.toBeInTheDocument();
  });

  it("uses page query pagination for dense shop browsing", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue(
      Array.from({ length: 25 }, (_, index) =>
        productFixture({
          id: `product_${index + 1}`,
          name: `Shop Product ${index + 1}`,
          slug: `shop-product-${index + 1}`
        })
      ) as never
    );

    render(await ShopPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(screen.getByText("Shop Product 25")).toBeVisible();
    expect(screen.queryByText("Shop Product 1")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Product pages" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Previous product page" })).toHaveAttribute(
      "href",
      "/shop"
    );
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Next product page")).toHaveAttribute("aria-disabled", "true");
  });

  it("falls back to the first page for invalid page query values", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue(
      Array.from({ length: 25 }, (_, index) =>
        productFixture({
          id: `product_${index + 1}`,
          name: `Shop Product ${index + 1}`,
          slug: `shop-product-${index + 1}`
        })
      ) as never
    );

    render(await ShopPage({ searchParams: Promise.resolve({ page: "nope" }) }));

    expect(screen.getByText("Shop Product 1")).toBeVisible();
    expect(screen.queryByText("Shop Product 25")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Previous product page")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.getByRole("link", { name: "Next product page" })).toHaveAttribute(
      "href",
      "/shop?page=2"
    );
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
