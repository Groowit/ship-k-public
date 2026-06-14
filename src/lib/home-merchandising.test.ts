import { describe, expect, it } from "vitest";
import { getHomeMerchandisingProducts } from "./home-merchandising";
import { launchCatalogProducts, Product } from "./products";

describe("home merchandising", () => {
  it("keeps Popular picks popularity-ranked across singles and sets", () => {
    const products = [
      productFixture(0, {
        id: "set_low",
        slug: "set-low",
        productType: "set",
        salesCount: 4
      }),
      productFixture(1, {
        id: "single_top",
        slug: "single-top",
        productType: "single",
        salesCount: 12
      }),
      productFixture(2, {
        id: "set_high",
        slug: "set-high",
        productType: "set",
        salesCount: 10
      }),
      productFixture(3, {
        id: "single_middle",
        slug: "single-middle",
        productType: "single",
        salesCount: 8
      })
    ];

    const merchandising = getHomeMerchandisingProducts(products, {
      popularLimit: 4
    });
    const { popularProducts } = merchandising;

    expect("trendingProducts" in merchandising).toBe(false);
    expect(popularProducts.map((product) => product.slug)).toEqual([
      "single-top",
      "set-high",
      "single-middle",
      "set-low"
    ]);
  });

  it("uses eighteen Popular products by default", () => {
    const products = Array.from({ length: 22 }, (_, index) =>
      productFixture(index % launchCatalogProducts.length, {
        id: `product_${index}`,
        slug: `product-${index}`,
        productType: index % 3 === 0 ? "set" : "single",
        salesCount: 100 - index
      })
    );

    const { popularProducts } = getHomeMerchandisingProducts(products);

    expect(popularProducts).toHaveLength(18);
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
