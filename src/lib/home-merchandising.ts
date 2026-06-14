import type { Product } from "@/lib/products";

const defaultPopularLimit = 12;
const popularCategory = "Skincare";

type HomeMerchandisingOptions = {
  popularLimit?: number;
};

export function getHomeMerchandisingProducts(
  products: Product[],
  options: HomeMerchandisingOptions = {}
) {
  const sortedProducts = products
    .filter((product) => product.category === popularCategory)
    .sort(compareHomePopularProducts);
  const popularLimit = normalizeMerchandisingLimit(
    options.popularLimit,
    defaultPopularLimit
  );

  return {
    popularProducts: sortedProducts.slice(0, popularLimit)
  };
}

function compareHomePopularProducts(a: Product, b: Product) {
  return (
    getCount(b.recentSalesCount) - getCount(a.recentSalesCount) ||
    getCount(b.salesCount) - getCount(a.salesCount) ||
    getTime(b.createdAt) - getTime(a.createdAt) ||
    a.name.localeCompare(b.name)
  );
}

function getCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getTime(value?: string) {
  return value ? new Date(value).getTime() || 0 : 0;
}

function normalizeMerchandisingLimit(value: number | undefined, fallback: number) {
  const limit = value ?? fallback;
  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }
  return Math.floor(limit);
}
