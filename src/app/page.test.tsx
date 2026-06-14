/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { listActiveProducts } from "@/lib/commerce-store";
import { listHomeBanners } from "@/lib/home-banners";
import { listHomeCurationProducts } from "@/lib/home-curation";
import type { Product } from "@/lib/products";

vi.mock("@/components/home-feature-banner", () => ({
  HomeFeatureBanner: ({ banners }: { banners: unknown[] }) => (
    <div data-testid="home-feature-banner">{JSON.stringify(banners)}</div>
  )
}));

vi.mock("@/components/product-card", () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.name}</div>
  )
}));

vi.mock("@/components/home-curation-rail", () => ({
  HomeCurationRail: ({ products }: { products: Product[] }) => (
    <div data-testid="home-curation-rail">
      {products.map((product) => (
        <a key={product.id} href={`/products/${product.slug}`}>
          {product.name}
        </a>
      ))}
    </div>
  )
}));

vi.mock("@/lib/commerce-store", () => ({
  listActiveProducts: vi.fn()
}));

vi.mock("@/lib/home-banners", () => ({
  listHomeBanners: vi.fn()
}));

vi.mock("@/lib/home-curation", () => ({
  listHomeCurationProducts: vi.fn()
}));

vi.mock("@/lib/home-merchandising", () => ({
  getHomeMerchandisingProducts: (products: Product[]) => ({
    popularProducts: products.slice(0, 2)
  })
}));

describe("HomePage", () => {
  it("renders managed home banners before product fallback banners", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([productFixture()] as never);
    vi.mocked(listHomeCurationProducts).mockResolvedValue([] as never);
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
    vi.mocked(listHomeCurationProducts).mockResolvedValue([] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([] as never);

    render(await HomePage());

    const payload = screen.getByTestId("home-feature-banner").textContent ?? "";
    expect(payload).toContain("Build a dewy set in one day");
    expect(payload).toContain("/products/glow-set");
  });

  it("renders curated products in admin order without the old Trending heading", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([
      productFixture({ id: "popular_1", name: "Popular One", slug: "popular-one" }),
      productFixture({ id: "popular_2", name: "Popular Two", slug: "popular-two" })
    ] as never);
    vi.mocked(listHomeCurationProducts).mockResolvedValue([
      productFixture({ id: "curated_2", name: "Second Curated", slug: "second-curated" }),
      productFixture({ id: "curated_1", name: "First Curated", slug: "first-curated" })
    ] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([] as never);

    render(await HomePage());

    expect(screen.getByText("Curated picks")).toBeVisible();
    expect(screen.getByText("Curated for you")).toBeVisible();
    expect(screen.getByText("Fresh picks from the shipK edit.")).toBeVisible();
    expect(screen.getByTestId("home-curation-rail")).toHaveTextContent("Second Curated");
    expect(screen.getByTestId("home-curation-rail")).toHaveTextContent("First Curated");
    expect(screen.queryByText("Trending now")).not.toBeInTheDocument();
    expect(screen.getByText("Popular picks")).toBeVisible();
    expect(screen.getByText("Popular One")).toBeVisible();
  });

  it("hides the curation shelf when no curated products are eligible", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([productFixture()] as never);
    vi.mocked(listHomeCurationProducts).mockResolvedValue([] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([] as never);

    render(await HomePage());

    expect(screen.queryByText("Curated for you")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-curation-rail")).not.toBeInTheDocument();
    expect(screen.queryByText("Trending now")).not.toBeInTheDocument();
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
