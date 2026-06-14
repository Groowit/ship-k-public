import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeFeatureBanner } from "@/components/home-feature-banner";
import type { HomeBannerSlide } from "@/components/home-feature-banner";
import { HomeCurationRail } from "@/components/home-curation-rail";
import { HomePopularProductCard } from "@/components/home-popular-product-card";
import { listActiveProducts } from "@/lib/commerce-store";
import { listHomeBanners } from "@/lib/home-banners";
import { listHomeCurationProducts } from "@/lib/home-curation";
import { getHomeMerchandisingProducts } from "@/lib/home-merchandising";
import type { Product } from "@/lib/products";

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
  const skincareProducts = products.filter(isSkincareProduct);
  const featuredProducts = skincareProducts.slice(0, 6);
  const { popularProducts } = getHomeMerchandisingProducts(skincareProducts);
  const bannerSlides = homeBanners.length
    ? homeBanners.map((banner): HomeBannerSlide => ({
        id: banner.id,
        topic: banner.topic,
        headline: banner.headline,
        description: banner.description,
        backgroundImagePath: banner.backgroundImagePath,
        sideImagePath: banner.sideImagePath,
        linkPath: getPublicHomeBannerLinkPath(banner.linkPath),
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
      topic: "SEOUL ROUTINE",
      headline: "Keep skin prep simple"
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

function getPublicHomeBannerLinkPath(linkPath: string) {
  return isMakeupPath(linkPath) ? "/shop" : linkPath;
}

function isMakeupPath(linkPath: string) {
  return (
    linkPath === "/makeup" ||
    linkPath.startsWith("/makeup/") ||
    linkPath.startsWith("/makeup?")
  );
}

function isSkincareProduct(product: Product) {
  return product.category === "Skincare";
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
            Weekly best sellers first, then proven favorites and new skincare finds.
          </p>
        </div>
        <p className="text-sm font-black uppercase text-muted-foreground">
          Up to 12 picks
        </p>
      </div>
      <div
        data-testid="home-popular-grid"
        className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:gap-4"
      >
        {products.map((product) => (
          <HomePopularProductCard key={product.id} product={product} />
        ))}
      </div>
      <PopularMoreLink />
    </section>
  );
}

function PopularMoreLink() {
  return (
    <div className="mt-9 flex justify-center">
      <Link
        href="/shop"
        className="group inline-flex items-center gap-2 rounded-md border border-foreground bg-foreground px-5 py-3 text-sm font-black text-background transition hover:border-[#ff3d7f] hover:bg-[#ff3d7f] focus-ring"
      >
        Shop skincare
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </div>
  );
}
