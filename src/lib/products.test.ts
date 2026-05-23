import { describe, expect, it } from "vitest";
import {
  demoProducts,
  filterProductsByCollection,
  getActiveCollections,
  productCollections
} from "./products";

describe("curated set catalog", () => {
  it("ships six active demo curated sets", () => {
    expect(demoProducts).toHaveLength(6);
    expect(demoProducts.every((product) => product.productType === "curated_set")).toBe(
      true
    );
    expect(demoProducts.map((product) => product.slug)).toEqual([
      "daily-k-glow-set",
      "k-pop-idol-look",
      "glass-skin-starter",
      "y2k-cute-bomb",
      "cool-tone-drama",
      "warm-honey-look"
    ]);
    expect(demoProducts.map((product) => product.option.priceCents)).toEqual([
      4900, 6900, 5500, 5900, 6500, 5900
    ]);
    expect(demoProducts.every((product) => product.galleryImages.length > 0)).toBe(true);
  });

  it("keeps Date Night available for admin but hidden until it has an active set", () => {
    expect(productCollections.map((collection) => collection.slug)).toContain(
      "date-night"
    );
    expect(getActiveCollections(demoProducts).map((collection) => collection.slug)).not.toContain(
      "date-night"
    );
  });

  it("filters products by collection slug and leaves All unfiltered", () => {
    expect(filterProductsByCollection(demoProducts, "all")).toHaveLength(6);
    expect(filterProductsByCollection(demoProducts, undefined)).toHaveLength(6);
    expect(filterProductsByCollection(demoProducts, "daily-glow")).toEqual([
      demoProducts[0]
    ]);
    expect(filterProductsByCollection(demoProducts, "date-night")).toEqual([]);
  });
});
