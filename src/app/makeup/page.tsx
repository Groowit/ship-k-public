import { CatalogFilter, CatalogPage } from "@/components/catalog-page";
import { listActiveProducts } from "@/lib/commerce-store";
import { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

const eyeCategories = new Set(["Eye", "Brow", "Lash"]);
const faceCategories = new Set(["Base", "Finish", "Tool"]);
const makeupFilters: CatalogFilter[] = [
  {
    slug: "lips",
    label: "Lips",
    matches: (product) => hasIncludedCategory(product, (category) => category === "Lip")
  },
  {
    slug: "eyes",
    label: "Eyes",
    matches: (product) => hasIncludedCategory(product, (category) => eyeCategories.has(category))
  },
  {
    slug: "face",
    label: "Face",
    matches: (product) => hasIncludedCategory(product, (category) => faceCategories.has(category))
  },
  {
    slug: "cheeks",
    label: "Cheeks",
    matches: (product) => hasIncludedCategory(product, (category) => category === "Cheek")
  },
  {
    slug: "makeup-set",
    label: "Makeup set",
    matches: (product) => product.productType === "set"
  }
];

export default async function MakeupPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedFilterSlug =
    typeof params.filter === "string" ? params.filter : "all";
  const activeProducts = (await listActiveProducts()).filter(
    (product) => product.category === "Makeup"
  );

  return (
    <CatalogPage
      activeProducts={activeProducts}
      basePath="/makeup"
      selectedFilterSlug={selectedFilterSlug}
      filters={makeupFilters}
      filterQueryParam="filter"
      allFilterLabel="All ★"
      title="Makeup Sets"
      highlightedTitleText="Makeup"
    />
  );
}

function hasIncludedCategory(
  product: Product,
  predicate: (category: string) => boolean
) {
  return product.includedItems.some((item) => predicate(item.category));
}
