import { sortProductsByPopularity } from "@/lib/commerce-store";
import type { Product } from "@/lib/products";

const defaultPopularLimit = 18;

type HomeMerchandisingOptions = {
  popularLimit?: number;
};

export function getHomeMerchandisingProducts(
  products: Product[],
  options: HomeMerchandisingOptions = {}
) {
  const sortedProducts = sortProductsByPopularity(products);
  const popularLimit = normalizeMerchandisingLimit(
    options.popularLimit,
    defaultPopularLimit
  );

  return {
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
