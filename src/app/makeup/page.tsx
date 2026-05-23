import { CatalogFilter, CatalogPage } from "@/components/catalog-page";
import { listActiveProducts } from "@/lib/mvp-store";
import { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

const eyeCategories = new Set(["Eye", "Brow", "Lash"]);
const faceCategories = new Set(["Base", "Finish", "Tool"]);
const makeupCategories = new Set(["Base", "Brow", "Cheek", "Eye", "Finish", "Lash", "Lip", "Tool"]);

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
    matches: isMakeupRoutine
  }
];

export default async function MakeupPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedCollection =
    typeof params.collection === "string" ? params.collection : "all";
  const activeProducts = (await listActiveProducts()).filter(isMakeupRoutine);

  return (
    <CatalogPage
      activeProducts={activeProducts}
      basePath="/makeup"
      selectedCollection={selectedCollection}
      filters={makeupFilters}
      allFilterLabel="All ★"
    />
  );
}

function isMakeupRoutine(product: Product) {
  return hasIncludedCategory(product, (category) => makeupCategories.has(category));
}

function hasIncludedCategory(
  product: Product,
  predicate: (category: string) => boolean
) {
  return product.includedItems.some((item) => predicate(item.category));
}
