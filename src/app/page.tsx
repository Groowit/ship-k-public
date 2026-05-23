import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HomeFeatureBanner } from "@/components/home-feature-banner";
import { ProductCard } from "@/components/product-card";
import { getCollectionVisual } from "@/lib/brand-visuals";
import { listActiveProducts } from "@/lib/mvp-store";
import { getActiveCollections, getProductPriceLabel, Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listActiveProducts();
  const featuredProducts = products.slice(0, 6);
  const collections = getActiveCollections(products);
  const bestSellerProducts = featuredProducts.slice(0, 4);

  return (
    <div className="overflow-hidden">
      <HomeFeatureBanner products={featuredProducts} />
      <BestSellerSection products={bestSellerProducts} />

      <div className="shipk-marquee">
        <div className="shipk-marquee-track" aria-hidden="true">
          <span>★ TRENDING NOW IN SEOUL</span>
          <span>♥ DIRECT FROM SEOUL</span>
          <span>♥ GET YOUR GLASS SKIN</span>
          <span>★ TRENDING NOW IN SEOUL</span>
          <span>♥ DIRECT FROM SEOUL</span>
          <span>♥ GET YOUR GLASS SKIN</span>
        </div>
      </div>

      <section className="container py-12">
        <div className="mb-8 grid gap-5">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Starter bundles
            </p>
            <h2 className="mt-2 shipk-heading text-4xl">
              Shop by look
            </h2>
          </div>
          <nav className="flex gap-3 overflow-x-auto pb-1" aria-label="Collection filters">
            <Link href="/shop" className="shipk-chip shipk-chip-active shrink-0">
              All kits
            </Link>
            {collections.map((collection) => (
              <Link
                key={collection.slug}
                href={`/shop?collection=${collection.slug}`}
                className="shipk-chip shrink-0 hover:bg-[#ffd6e3]"
              >
                {collection.name}
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
      <Link
        href="/shop"
        className="mx-auto inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-md border border-[#d8d8d8] bg-white px-4 text-sm font-bold text-muted-foreground transition hover:border-black hover:text-foreground"
      >
        Recommend another set
        <span className="ml-4 text-foreground">1</span>
        <span className="mx-2 text-[#c8c8c8]">|</span>
        <span className="text-[#a8a8a8]">{Math.max(products.length, 1)}</span>
      </Link>
    </section>
  );
}

function CompactProductCard({ product, rank }: { product: Product; rank: number }) {
  const visual = getCollectionVisual(product.collectionSlug);
  const chips = [
    product.badges[0],
    product.difficulty,
    product.itemCount ? `${product.itemCount} items` : product.category
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
          <span className="absolute left-3 top-3 z-10 rounded-full border-2 border-[#ff4a57] bg-white px-3 py-2 text-sm font-black text-[#ff4a57]">
            BEST
          </span>
          <span className="absolute right-3 top-3 z-10 rounded-full bg-[#ff7a1a] px-3 py-2 text-xs font-black text-white">
            {visual.themeWord}
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
            [{product.collectionName ?? product.brandName}] {product.name}
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
