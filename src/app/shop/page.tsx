import { CatalogFilter, CatalogPage } from "@/components/catalog-page";
import { listActiveProducts } from "@/lib/commerce-store";
import { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

const skincareCategories = new Set([
  "Ampoule",
  "Cleanser",
  "Cream",
  "Essence",
  "Mask",
  "Serum",
  "Sun Care",
  "Toner"
]);
const faceSerumCategories = new Set(["Ampoule", "Essence", "Serum"]);
const moisturizerCategories = new Set(["Cream", "Mask"]);

const skincareFilters: CatalogFilter[] = [
  {
    slug: "face-cleansers",
    label: "Face Cleansers",
    matches: (product) => hasIncludedCategory(product, (category) => category === "Cleanser")
  },
  {
    slug: "face-serums",
    label: "Face Serums",
    matches: (product) =>
      hasIncludedCategory(product, (category) => faceSerumCategories.has(category))
  },
  {
    slug: "moisturizers",
    label: "Moisturizers",
    matches: (product) =>
      hasIncludedCategory(product, (category) => moisturizerCategories.has(category))
  },
  {
    slug: "toners",
    label: "Toners",
    matches: (product) => hasIncludedCategory(product, (category) => category === "Toner")
  }
];

export default async function ShopPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedCollection =
    typeof params.collection === "string" ? params.collection : "all";
  const activeProducts = (await listActiveProducts()).filter(isSkincareRoutine);

  return (
    <CatalogPage
      activeProducts={activeProducts}
      basePath="/shop"
      selectedCollection={selectedCollection}
      filters={skincareFilters}
      allFilterLabel="All"
      title="Get the Glass Skin"
      highlightedTitleText="Glass Skin"
    />
  );
}

function isSkincareRoutine(product: Product) {
  return hasIncludedCategory(product, (category) => skincareCategories.has(category));
}

function hasIncludedCategory(
  product: Product,
  predicate: (category: string) => boolean
) {
  return product.includedItems.some((item) => predicate(item.category));
}
