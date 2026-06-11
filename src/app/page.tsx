import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Droplets, Palette } from "lucide-react";
import { HomeFeatureBanner } from "@/components/home-feature-banner";
import { ProductCard } from "@/components/product-card";
import { getProductVisual } from "@/lib/brand-visuals";
import { listActiveProducts } from "@/lib/commerce-store";
import { getHomeMerchandisingProducts } from "@/lib/home-merchandising";
import { getImageOptimizationProps } from "@/lib/image-path";
import { getProductPriceLabel, Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listActiveProducts();
  const featuredProducts = products.slice(0, 6);
  const { trendingProducts, popularProducts } = getHomeMerchandisingProducts(products);

  return (
    <div className="overflow-hidden">
      <HomeFeatureBanner products={featuredProducts} />
      <BestSellerSection products={trendingProducts} />

      <div className="shipk-marquee">
        <div className="shipk-marquee-track" aria-hidden="true">
          <span>★ TRENDING NOW IN SEOUL</span>
          <span>♥ DIRECT FROM SEOUL</span>
          <span>♥ BUILD YOUR SET</span>
          <span>★ TRENDING NOW IN SEOUL</span>
          <span>♥ DIRECT FROM SEOUL</span>
          <span>♥ BUILD YOUR SET</span>
        </div>
      </div>

      <PopularProductsSection products={popularProducts} />
    </div>
  );
}

function BestSellerSection({ products }: { products: Product[] }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="border-b border-zinc-200 bg-white">
      <div className="container py-12">
        <ProductShelf
          title="Trending now"
          products={products}
        />
      </div>
    </section>
  );
}

function PopularProductsSection({ products }: { products: Product[] }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="container py-12">
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
            Popular picks
          </p>
          <h2 className="mt-2 shipk-heading text-4xl">
            Loved across shipK
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
            Sets and single products ranked together, so shoppers can scan what is moving now.
          </p>
        </div>
        <p className="text-sm font-black uppercase text-muted-foreground">
          Showing up to 18
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} rank={index} />
        ))}
      </div>
      <ExploreMoreLinks />
    </section>
  );
}

function ExploreMoreLinks() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <ExploreMoreLink
        href="/shop"
        eyebrow="Skincare"
        title="Explore skincare sets"
        body="Hydration, skin prep, and routine-first picks."
        className="bg-[#dcfff4]"
        icon={<Droplets className="h-5 w-5" aria-hidden="true" />}
      />
      <ExploreMoreLink
        href="/makeup"
        eyebrow="Makeup"
        title="Explore makeup sets"
        body="Glossy, warm, and defined looks in one place."
        className="bg-[#fff8f0]"
        icon={<Palette className="h-5 w-5" aria-hidden="true" />}
      />
    </div>
  );
}

function ExploreMoreLink({
  href,
  eyebrow,
  title,
  body,
  className,
  icon
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  className: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid min-h-40 gap-4 rounded-lg border border-zinc-200 p-5 transition hover:-translate-y-0.5 focus-ring",
        className
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white">
          {icon}
        </span>
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
      <span>
        <span className="font-brand-heavy text-xs uppercase text-[#ff3d7f]">
          {eyebrow}
        </span>
        <span className="mt-1 block text-2xl font-black leading-tight text-foreground">
          {title}
        </span>
        <span className="mt-2 block text-sm font-semibold leading-6 text-muted-foreground">
          {body}
        </span>
      </span>
    </Link>
  );
}

function ProductShelf({
  title,
  products,
  className
}: {
  title: React.ReactNode;
  products: Product[];
  className?: string;
}) {
  return (
    <section className={cn("grid gap-8", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-black tracking-normal text-black">{title}</h2>
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm font-black text-muted-foreground hover:text-foreground"
        >
          See more
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <CompactProductCard key={product.id} product={product} rank={index} />
        ))}
      </div>
    </section>
  );
}

function CompactProductCard({ product, rank }: { product: Product; rank: number }) {
  const visual = getProductVisual(product);
  const primaryBadge = product.badges[0];
  const primaryTag = product.tags[0] ?? visual.themeWord;
  const itemCountLabel = product.itemCount ? `${product.itemCount} items` : product.category;
  const chips = [
    ...product.tags.filter((tag) => tag.toLowerCase() !== itemCountLabel.toLowerCase()).slice(0, 2),
    product.difficulty,
    itemCountLabel
  ].filter(Boolean);

  return (
    <Link href={`/products/${product.slug}`} className="group block focus-ring rounded-lg">
      <article className="grid gap-3">
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-lg border bg-white",
            rank === 0 ? "border-[#e9c64d]" : "border-zinc-200"
          )}
        >
          <span className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-3 py-1.5 text-sm font-black text-black">
            #{rank + 1}
          </span>
          {primaryBadge ? (
            <span className="absolute right-3 top-3 z-10 rounded-md bg-[#793de1] px-3 py-2 text-xs font-black text-[#fff75f]">
              {primaryBadge}
            </span>
          ) : null}
          <span className="absolute bottom-3 left-3 z-10 max-w-[8rem] rounded-md bg-black px-3 py-2 text-xs font-black uppercase leading-tight text-white">
            {primaryTag}
          </span>
          <Image
            src={product.heroImagePath}
            alt={`${product.name} bestseller image`}
            fill
            {...getImageOptimizationProps(product.heroImagePath)}
            sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 90vw"
            className="object-cover"
          />
        </div>
        <div className="grid gap-2">
          <h3 className="line-clamp-2 min-h-12 text-lg font-semibold leading-6 text-[#191919]">
            [{product.category}] {product.name}
          </h3>
          <p className="font-brand-heavy text-2xl text-[#f02525]">
            {getProductPriceLabel(product)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, index) => (
              <span
                key={`${chip}-${index}`}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-black text-white",
                  index === 0 ? "bg-[#f35d66]" : index === 1 ? "bg-[#e967b7]" : "bg-[#7dcc39]"
                )}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
