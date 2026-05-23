import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import {
  filterProductsByCollection,
  getActiveCollections,
  Product
} from "@/lib/products";
import { cn } from "@/lib/utils";

export type CatalogFilter = {
  slug: string;
  label: string;
  matches: (product: Product) => boolean;
};

export function CatalogPage({
  activeProducts,
  basePath,
  selectedCollection,
  filters,
  allFilterLabel = "All kits",
  eyebrow,
  title = "Get the K-Look",
  highlightedTitleText = "K-Look",
  description
}: {
  activeProducts: Product[];
  basePath: string;
  selectedCollection: string;
  filters?: CatalogFilter[];
  allFilterLabel?: string;
  eyebrow?: string;
  title?: string;
  highlightedTitleText?: string;
  description?: string;
}) {
  const collections = getActiveCollections(activeProducts);
  const filterItems =
    filters ??
    collections.map((collection) => ({
      slug: collection.slug,
      label: collection.name,
      matches: (product: Product) => product.collectionSlug === collection.slug
    }));
  const selectedFilter = filterItems.find((filter) => filter.slug === selectedCollection);
  const products = filters
    ? selectedCollection === "all" || !selectedFilter
      ? activeProducts
      : activeProducts.filter(selectedFilter.matches)
    : filterProductsByCollection(activeProducts, selectedCollection);

  return (
    <section className="container py-10">
      <div className="mb-9 grid gap-6">
        <div>
          {eyebrow ? (
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 shipk-hero-word text-5xl sm:text-6xl">
            <HighlightedTitle title={title} highlight={highlightedTitleText} />
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <nav className="flex gap-3 overflow-x-auto pb-1" aria-label="Collection filters">
          <FilterLink href={basePath} active={selectedCollection === "all"}>
            {allFilterLabel}
          </FilterLink>
          {filterItems.map((filter) => (
            <FilterLink
              key={filter.slug}
              href={`${basePath}?collection=${filter.slug}`}
              active={selectedCollection === filter.slug}
            >
              {filter.label}
            </FilterLink>
          ))}
        </nav>
      </div>
      <div className="mb-7 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="inline-flex h-12 w-fit items-center gap-3 rounded-md border border-[#d8d8d8] bg-white px-4 text-sm font-black text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Collection filter
        </div>
        <p className="text-sm font-semibold text-muted-foreground md:text-center">
          {products.length} kits ready for your routine
        </p>
        <div className="inline-flex w-fit overflow-hidden rounded-md border border-[#d8d8d8] bg-white text-sm font-black text-muted-foreground">
          <span className="px-4 py-3">1</span>
          <span className="border-l border-[#e4e4e4] px-4 py-3">of 1</span>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} rank={index} />
        ))}
      </div>
    </section>
  );
}

function HighlightedTitle({
  title,
  highlight
}: {
  title: string;
  highlight?: string;
}) {
  if (!highlight || !title.includes(highlight)) {
    return <>{title}</>;
  }

  const [before, after] = title.split(highlight);

  return (
    <>
      {before}
      <span className="text-[#ff3d7f]">{highlight}</span>
      {after}
    </>
  );
}

function FilterLink({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shipk-chip shrink-0 transition",
        active ? "shipk-chip-active" : "hover:bg-[#ffd6e3]"
      )}
    >
      {children}
    </Link>
  );
}
