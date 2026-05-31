import { describe, expect, it } from "vitest";
import {
  launchCatalogProducts,
  filterProductsByCategory,
  getActiveCategories,
  productCategories
} from "./products";

describe("set catalog", () => {
  it("ships six active launch catalog sets", () => {
    expect(launchCatalogProducts).toHaveLength(6);
    expect(launchCatalogProducts.every((product) => product.productType === "set")).toBe(true);
    expect(launchCatalogProducts.map((product) => product.slug)).toEqual([
      "skincare-starter-set",
      "makeup-starter-set",
      "hydration-skincare-set",
      "gloss-makeup-set",
      "definition-makeup-set",
      "warm-makeup-set"
    ]);
    expect(launchCatalogProducts.map((product) => product.option.priceCents)).toEqual([
      4900, 6900, 5500, 5900, 6500, 5900
    ]);
    expect(launchCatalogProducts.every((product) => product.galleryImages.length > 0)).toBe(true);
  });

  it("keeps product taxonomy limited to the real shop categories", () => {
    expect(productCategories).toEqual(["Skincare", "Makeup"]);
    expect(getActiveCategories(launchCatalogProducts)).toEqual(["Skincare", "Makeup"]);
    expect(new Set(launchCatalogProducts.map((product) => product.category))).toEqual(
      new Set(["Skincare", "Makeup"])
    );
  });

  it("filters products by category and leaves All unfiltered", () => {
    expect(filterProductsByCategory(launchCatalogProducts, "all")).toHaveLength(6);
    expect(filterProductsByCategory(launchCatalogProducts, undefined)).toHaveLength(6);
    expect(filterProductsByCategory(launchCatalogProducts, "Skincare")).toEqual([
      launchCatalogProducts[0],
      launchCatalogProducts[2]
    ]);
    expect(filterProductsByCategory(launchCatalogProducts, "makeup")).toEqual([
      launchCatalogProducts[1],
      launchCatalogProducts[3],
      launchCatalogProducts[4],
      launchCatalogProducts[5]
    ]);
    expect(filterProductsByCategory(launchCatalogProducts, "missing")).toEqual([]);
  });

  it("keeps legacy collection fields out of public product objects", () => {
    expect(Object.keys(launchCatalogProducts[0])).not.toContain("collectionSlug");
    expect(Object.keys(launchCatalogProducts[0])).not.toContain("collectionName");
    expect(Object.keys(launchCatalogProducts[0])).not.toContain("themeLabel");
  });

  it("separates merchandising badges from product tags", () => {
    expect(launchCatalogProducts[0].badges).toEqual([]);
    expect(launchCatalogProducts[0].tags).toEqual(["STARTER", "SKINCARE", "5 ITEMS"]);
    expect(launchCatalogProducts[2].badges).toEqual([]);
    expect(launchCatalogProducts[2].tags).toContain("HYDRATION");
  });
});
