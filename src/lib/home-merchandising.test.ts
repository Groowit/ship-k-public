import { describe, expect, it } from "vitest";
import { getHomeMerchandisingProducts } from "./home-merchandising";
import { launchCatalogProducts, Product } from "./products";

describe("home merchandising", () => {
  it("keeps Popular picks ranked by recent sales, cumulative sales, then newest skincare products", () => {
    const products = [
      productFixture(0, {
        id: "older_cumulative",
        slug: "older-cumulative",
        productType: "set",
        category: "Skincare",
        recentSalesCount: 0,
        salesCount: 40,
        createdAt: "2026-05-01T00:00:00.000Z"
      }),
      productFixture(1, {
        id: "makeup_recent",
        slug: "makeup-recent",
        productType: "single",
        category: "Makeup",
        recentSalesCount: 99,
        salesCount: 99,
        createdAt: "2026-06-13T00:00:00.000Z"
      }),
      productFixture(2, {
        id: "weekly_top",
        slug: "weekly-top",
        productType: "set",
        category: "Skincare",
        recentSalesCount: 7,
        salesCount: 12,
        createdAt: "2026-05-03T00:00:00.000Z"
      }),
      productFixture(3, {
        id: "newest_fallback",
        slug: "newest-fallback",
        productType: "single",
        category: "Skincare",
        recentSalesCount: 0,
        salesCount: 0,
        createdAt: "2026-06-12T00:00:00.000Z"
      })
    ];

    const merchandising = getHomeMerchandisingProducts(products, {
      popularLimit: 4
    });
    const { popularProducts } = merchandising;

    expect("trendingProducts" in merchandising).toBe(false);
    expect(popularProducts.map((product) => product.slug)).toEqual([
      "weekly-top",
      "older-cumulative",
      "newest-fallback"
    ]);
  });

  it("uses twelve Popular products by default", () => {
    const products = Array.from({ length: 22 }, (_, index) =>
      productFixture(index % launchCatalogProducts.length, {
        id: `product_${index}`,
        slug: `product-${index}`,
        category: "Skincare",
        productType: index % 3 === 0 ? "set" : "single",
        salesCount: 100 - index
      })
    );

    const { popularProducts } = getHomeMerchandisingProducts(products);

    expect(popularProducts).toHaveLength(12);
  });

  it("clamps negative popular limits to an empty Popular shelf", () => {
    const products = Array.from({ length: 4 }, (_, index) =>
      productFixture(index % launchCatalogProducts.length, {
        id: `product_${index}`,
        slug: `product-${index}`,
        productType: "set",
        salesCount: 100 - index
      })
    );

    const { popularProducts } = getHomeMerchandisingProducts(products, {
      popularLimit: -2
    });

    expect(popularProducts).toEqual([]);
  });
});

function productFixture(
  seedIndex: number,
  overrides: Partial<Product> & Pick<Product, "id" | "slug">
): Product {
  const seed = launchCatalogProducts[seedIndex];

  return {
    ...seed,
    ...overrides,
    name: overrides.name ?? overrides.slug,
    option: {
      ...seed.option,
      id: `${overrides.id}_option`,
      sku: `SKU-${overrides.id}`
    }
  };
}
