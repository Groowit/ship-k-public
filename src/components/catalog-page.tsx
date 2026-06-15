import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomePopularProductCard } from "@/components/home-popular-product-card";
import { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export function CatalogPage({
  activeProducts,
  basePath,
  currentPage = 1,
  pageSize = 24,
  eyebrow,
  title = "Get the K-Look",
  highlightedTitleText = "K-Look",
  description
}: {
  activeProducts: Product[];
  basePath: string;
  currentPage?: number;
  pageSize?: number;
  eyebrow?: string;
  title?: string;
  highlightedTitleText?: string;
  description?: string;
}) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(activeProducts.length / safePageSize));
  const page = clamp(currentPage, 1, totalPages);
  const products = activeProducts.slice((page - 1) * safePageSize, page * safePageSize);

  return (
    <section className="container py-10">
      <div className="mb-9">
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
      </div>
      <div
        data-testid="catalog-product-grid"
        className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:gap-4"
      >
        {products.map((product) => (
          <HomePopularProductCard key={product.id} product={product} />
        ))}
      </div>
      <CatalogPagination basePath={basePath} page={page} totalPages={totalPages} />
    </section>
  );
}

function CatalogPagination({
  basePath,
  page,
  totalPages
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  return (
    <nav
      className="mt-10 flex items-center justify-center gap-2"
      aria-label="Product pages"
    >
      <PaginationLink
        href={getPageHref(basePath, page - 1)}
        disabled={page === 1}
        ariaLabel="Previous product page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Previous</span>
      </PaginationLink>
      {Array.from({ length: totalPages }).map((_, index) => {
        const pageNumber = index + 1;
        const active = pageNumber === page;

        return (
          <Link
            key={pageNumber}
            href={getPageHref(basePath, pageNumber)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm font-black transition focus-ring",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-zinc-300 bg-white text-foreground hover:border-[#ff3d7f] hover:text-[#ff3d7f]"
            )}
          >
            {pageNumber}
          </Link>
        );
      })}
      <PaginationLink
        href={getPageHref(basePath, page + 1)}
        disabled={page === totalPages}
        ariaLabel="Next product page"
      >
        <span className="sr-only">Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  ariaLabel,
  children
}: {
  href: string;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={ariaLabel}
        className="grid h-10 min-w-10 place-items-center rounded-md border border-zinc-200 bg-white px-3 text-zinc-300"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="grid h-10 min-w-10 place-items-center rounded-md border border-zinc-300 bg-white px-3 text-foreground transition hover:border-[#ff3d7f] hover:text-[#ff3d7f] focus-ring"
    >
      {children}
    </Link>
  );
}

function getPageHref(basePath: string, page: number) {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
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
