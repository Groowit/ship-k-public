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

  it("does not expose stale managed Makeup banner links on the public home page", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([productFixture()] as never);
    vi.mocked(listHomeCurationProducts).mockResolvedValue([] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([
      {
        id: "banner_1",
        topic: "ADMIN",
        headline: "Managed makeup banner",
        description: "Stale managed link",
        backgroundImagePath: "/managed-bg.png",
        linkPath: "/makeup?filter=lips",
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
    expect(payload).not.toContain("/makeup");
    expect(payload).toContain("\"linkPath\":\"/shop\"");
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

  it("renders Popular picks as compact skincare cards with one shop CTA", async () => {
    vi.mocked(listActiveProducts).mockResolvedValue([
      productFixture({
        id: "popular_1",
        name: "Weekly Dew Cream",
        slug: "weekly-dew-cream",
        brandName: "Dew Lab",
        shortDescription: "요즘 가장 많이 담긴 보습 크림",
        category: "Skincare",
        option: {
          id: "option_weekly",
          name: "Default option",
          sku: "WEEKLY-DEW",
          priceCents: 3200,
          stockQuantity: 10
        }
      }),
      productFixture({
        id: "popular_2",
        name: "Makeup Recent",
        slug: "makeup-recent",
        category: "Makeup"
      })
    ] as never);
    vi.mocked(listHomeCurationProducts).mockResolvedValue([] as never);
    vi.mocked(listHomeBanners).mockResolvedValue([] as never);

    render(await HomePage());

    expect(screen.getByTestId("home-popular-grid")).toHaveClass("grid-cols-3");
    expect(screen.getByTestId("home-popular-grid")).toHaveClass("md:grid-cols-4");
    expect(screen.getByText("Dew Lab")).toBeVisible();
    expect(screen.getByText("Weekly Dew Cream")).toBeVisible();
    expect(screen.getByText("요즘 가장 많이 담긴 보습 크림")).toBeVisible();
    expect(screen.getByText("$32.00")).toBeVisible();
    expect(screen.queryByText("Makeup Recent")).not.toBeInTheDocument();
    expect(screen.queryByText("Showing up to 18")).not.toBeInTheDocument();

    const shopLinks = screen.getAllByRole("link", { name: /shop skincare/i });
    expect(shopLinks).toHaveLength(1);
    expect(shopLinks[0]).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("link", { name: /makeup/i })).not.toBeInTheDocument();
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
