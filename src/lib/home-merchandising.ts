import { sortProductsByPopularity } from "@/lib/commerce-store";
import type { Product } from "@/lib/products";

const defaultTrendingLimit = 4;
const defaultPopularLimit = 18;

type HomeMerchandisingOptions = {
  trendingLimit?: number;
  popularLimit?: number;
};

export function getHomeMerchandisingProducts(
  products: Product[],
  options: HomeMerchandisingOptions = {}
) {
  const sortedProducts = sortProductsByPopularity(products);
  const trendingLimit = normalizeMerchandisingLimit(
    options.trendingLimit,
    defaultTrendingLimit
  );
  const popularLimit = normalizeMerchandisingLimit(
    options.popularLimit,
    defaultPopularLimit
  );

  return {
    trendingProducts: sortedProducts
      .filter((product) => product.productType === "set")
      .slice(0, trendingLimit),
    popularProducts: sortedProducts.slice(0, popularLimit)
  };
}

function normalizeMerchandisingLimit(value: number | undefined, fallback: number) {
  const limit = value ?? fallback;
  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }
  return Math.floor(limit);
}
