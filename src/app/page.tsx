import type React from "react";
import Link from "next/link";
import { ArrowRight, Droplets, Palette } from "lucide-react";
import { HomeFeatureBanner } from "@/components/home-feature-banner";
import type { HomeBannerSlide } from "@/components/home-feature-banner";
import { HomeCurationRail } from "@/components/home-curation-rail";
import { ProductCard } from "@/components/product-card";
import { listActiveProducts } from "@/lib/commerce-store";
import { listHomeBanners } from "@/lib/home-banners";
import { listHomeCurationProducts } from "@/lib/home-curation";
import { getHomeMerchandisingProducts } from "@/lib/home-merchandising";
import { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const marqueeMessages = [
  "THE GOOD K-BEAUTY EDIT",
  "PICKS WITH A POINT OF VIEW",
  "NO OVERTHINKING, JUST GOOD BEAUTY",
  "KOREAN BRANDS, BETTER CONTEXT",
  "YOUR NEXT BEAUTY FIND",
  "CURATED TO FEEL EASY",
  "LESS GUESSWORK, MORE GLOW",
  "FROM KOREA, EDITED FOR YOU"
] as const;

export default async function HomePage() {
  const [products, homeBanners, curatedProducts] = await Promise.all([
    listActiveProducts(),
    listHomeBanners(),
    listHomeCurationProducts()
  ]);
  const featuredProducts = products.slice(0, 6);
  const { popularProducts } = getHomeMerchandisingProducts(products);
  const bannerSlides = homeBanners.length
    ? homeBanners.map((banner): HomeBannerSlide => ({
        id: banner.id,
        topic: banner.topic,
        headline: banner.headline,
        description: banner.description,
        backgroundImagePath: banner.backgroundImagePath,
        sideImagePath: banner.sideImagePath,
        linkPath: banner.linkPath,
        fontKey: banner.fontKey,
        textColor: banner.textColor,
        topicTextColor: banner.topicTextColor,
        headlineTextColor: banner.headlineTextColor,
        descriptionTextColor: banner.descriptionTextColor
      }))
    : getProductFallbackBannerSlides(featuredProducts);

  return (
    <div className="overflow-hidden">
      <HomeFeatureBanner banners={bannerSlides} />
      <HomeCurationSection products={curatedProducts} />

      <div className="shipk-marquee">
        <div className="shipk-marquee-track" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, sequenceIndex) => (
            <div className="shipk-marquee-sequence" key={`marquee-sequence-${sequenceIndex}`}>
              {marqueeMessages.map((message) => (
                <span key={`${sequenceIndex}-${message}`}>{message}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <PopularProductsSection products={popularProducts} />
    </div>
  );
}

function getProductFallbackBannerSlides(products: Product[]): HomeBannerSlide[] {
  const fallbackThemes = [
    {
      topic: "TODAY'S FOCUS",
      headline: "Build a dewy set in one day"
    },
    {
      topic: "SEOUL TREND",
      headline: "Stage-bright idol makeup points"
    },
    {
      topic: "SKINCARE",
      headline: "Start skin prep the easy way"
    }
  ] as const;

  return products.slice(0, 3).map((product, index) => {
    const theme = fallbackThemes[index % fallbackThemes.length];
    return {
      id: product.id,
      topic: theme.topic,
      headline: theme.headline,
      description: `${product.name} · ${product.shortDescription}`,
      sideImagePath: product.heroImagePath,
      linkPath: `/products/${product.slug}`,
      fontKey: "black-sans",
      textColor: "black",
      topicTextColor: "black",
      headlineTextColor: "black",
      descriptionTextColor: "black"
    };
  });
}

function HomeCurationSection({ products }: { products: Product[] }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="border-b border-zinc-200 bg-white">
      <div className="container py-12">
        <div className="mb-7 grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
                Curated picks
              </p>
              <h2 className="mt-2 shipk-heading text-4xl">
                Curated for you
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                Fresh picks from the shipK edit.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex w-fit items-center gap-1 text-sm font-black text-muted-foreground hover:text-foreground"
            >
              See more
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <HomeCurationRail products={products} />
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
