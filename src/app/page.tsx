import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HomeFeatureBanner } from "@/components/home-feature-banner";
import { ProductCard } from "@/components/product-card";
import { getProductVisual } from "@/lib/brand-visuals";
import { listActiveProducts, sortProductsByPopularity } from "@/lib/commerce-store";
import { getActiveCategories, getProductPriceLabel, Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listActiveProducts();
  const featuredProducts = products.slice(0, 6);
  const categories = getActiveCategories(products);
  const trendingProducts = sortProductsByPopularity(products).slice(0, 4);

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

      <section className="container py-12">
        <div className="mb-8 grid gap-5">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Starter bundles
            </p>
            <h2 className="mt-2 shipk-heading text-4xl">
              Shop by category
            </h2>
          </div>
          <nav className="flex gap-3 overflow-x-auto pb-1" aria-label="Product categories">
            <Link href="/shop" className="shipk-chip shipk-chip-active shrink-0">
              All sets
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={category === "Makeup" ? "/makeup" : "/shop"}
                className="shipk-chip shrink-0 hover:bg-[#ffd6e3]"
              >
                {category}
              </Link>
            ))}
          </nav>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} rank={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BestSellerSection({ products }: { products: Product[] }) {
  return (
    <section className="border-b-2 border-black bg-white">
      <div className="container py-12">
        <ProductShelf
          title="Trending now"
          products={products}
        />
      </div>
    </section>
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
    <Link href={`/products/${product.slug}`} className="group block focus-ring rounded-md">
      <article className="grid gap-3">
        <div
          className={cn(
            "relative aspect-square overflow-hidden border-4 bg-white",
            rank === 0 ? "border-[#ffb000]" : "border-[#111827]",
            visual.bgClass
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
            sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 90vw"
            className="object-contain p-4 transition duration-300 group-hover:scale-[1.03]"
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
