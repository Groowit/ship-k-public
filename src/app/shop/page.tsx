import { CatalogPage } from "@/components/catalog-page";
import { listActiveProducts } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const currentPage = parsePageParam(params.page);
  const activeProducts = (await listActiveProducts()).filter(
    (product) => product.category === "Skincare"
  );

  return (
    <CatalogPage
      activeProducts={activeProducts}
      basePath="/shop"
      currentPage={currentPage}
      title="Skincare Sets"
      highlightedTitleText="Skincare"
    />
  );
}

function parsePageParam(value: string | string[] | undefined) {
  const pageValue = Array.isArray(value) ? value[0] : value;
  const page = Number(pageValue);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.trunc(page);
}
