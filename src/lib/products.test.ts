import { describe, expect, it } from "vitest";
import {
  launchCatalogProducts,
  filterProductsByCollection,
  getActiveCollections,
  productCollections
} from "./products";

describe("curated set catalog", () => {
  it("ships six active launch catalog curated sets", () => {
    expect(launchCatalogProducts).toHaveLength(6);
    expect(launchCatalogProducts.every((product) => product.productType === "curated_set")).toBe(
      true
    );
    expect(launchCatalogProducts.map((product) => product.slug)).toEqual([
      "daily-k-glow-set",
      "k-pop-idol-look",
      "glass-skin-starter",
      "y2k-cute-bomb",
      "cool-tone-drama",
      "warm-honey-look"
    ]);
    expect(launchCatalogProducts.map((product) => product.option.priceCents)).toEqual([
      4900, 6900, 5500, 5900, 6500, 5900
    ]);
    expect(launchCatalogProducts.every((product) => product.galleryImages.length > 0)).toBe(true);
  });

  it("keeps Date Night available for admin but hidden until it has an active set", () => {
    expect(productCollections.map((collection) => collection.slug)).toContain(
      "date-night"
    );
    expect(
      getActiveCollections(launchCatalogProducts).map((collection) => collection.slug)
    ).not.toContain("date-night");
  });

  it("filters products by collection slug and leaves All unfiltered", () => {
    expect(filterProductsByCollection(launchCatalogProducts, "all")).toHaveLength(6);
    expect(filterProductsByCollection(launchCatalogProducts, undefined)).toHaveLength(6);
    expect(filterProductsByCollection(launchCatalogProducts, "daily-glow")).toEqual([
      launchCatalogProducts[0]
    ]);
    expect(filterProductsByCollection(launchCatalogProducts, "date-night")).toEqual([]);
  });
});
