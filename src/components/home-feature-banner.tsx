"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const bannerThemes = [
  {
    eyebrow: "TODAY'S FOCUS",
    headline: "Complete a dewy routine in one day",
    background: "from-[#ffe7cf] via-[#ffd2ad] to-[#bdeff2]",
    glow: "bg-[#ff7a5c]"
  },
  {
    eyebrow: "SEOUL TREND",
    headline: "Stage-bright idol makeup points",
    background: "from-[#ffe25a] via-[#ffd6e3] to-[#bde0fe]",
    glow: "bg-[#ff3d7f]"
  },
  {
    eyebrow: "GLASS SKIN",
    headline: "Start glass skin the easy way",
    background: "from-[#dcfff4] via-[#bde0fe] to-[#fff8f0]",
    glow: "bg-[#49c6a3]"
  }
] as const;

export function HomeFeatureBanner({ products }: { products: Product[] }) {
  const slides = useMemo(() => products.slice(0, 3), [products]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!slides.length) {
    return null;
  }

  const product = slides[activeIndex];
  const theme = bannerThemes[activeIndex % bannerThemes.length];
  const countLabel = `${activeIndex + 1}/${slides.length}`;

  return (
    <section
      className={cn(
        "relative overflow-hidden border-y-4 border-black bg-gradient-to-r",
        theme.background
      )}
      aria-label="Featured routine banner"
    >
      <div className="absolute inset-y-0 right-0 hidden w-[48%] bg-white/20 backdrop-blur-[1px] lg:block" />
      <div className="relative mx-auto grid min-h-[26rem] w-full max-w-[1920px] items-center gap-6 px-8 py-8 sm:px-12 md:min-h-[34rem] md:px-16 md:py-14 lg:min-h-[36rem] lg:grid-cols-[0.9fr_1.1fr] lg:px-24 lg:py-16">
        <div className="relative z-10 max-w-2xl">
          <p className="font-brand-heavy text-lg text-black md:text-xl">
            {theme.eyebrow}
          </p>
          <span className="mt-6 block h-0.5 w-8 bg-black/25" aria-hidden="true" />
          <h1 className="mt-7 max-w-[14ch] text-4xl font-black leading-[1.12] tracking-normal text-[#1c1c1c] [word-break:keep-all] sm:text-5xl md:text-6xl">
            {theme.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg font-black leading-7 text-black/55 md:text-xl">
            {product.name} · {product.shortDescription}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-black bg-white px-6 text-sm font-black shadow-[4px_4px_0_#0a0a0a] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a0a0a]"
            >
              Shop the focus
            </Link>
          </div>
        </div>
        <div className="relative z-10 min-h-[18rem] md:min-h-[27rem] lg:min-h-[30rem]">
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 block overflow-hidden rounded-md"
            aria-label={`Shop ${product.name}`}
          >
            <span
              className={cn(
                "absolute bottom-4 right-6 h-52 w-52 rounded-full opacity-40 blur-3xl md:h-80 md:w-80",
                theme.glow
              )}
              aria-hidden="true"
            />
            <Image
              src={product.heroImagePath}
              alt={`${product.name} banner image`}
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-contain object-top px-4 pb-20 pt-3 md:px-8 md:pb-24 md:pt-5 lg:px-12 lg:pb-28 lg:pt-6"
            />
          </Link>
        </div>
      </div>
      <BannerControls
        countLabel={countLabel}
        paused={paused}
        onPrevious={() =>
          setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
        }
        onNext={() => setActiveIndex((current) => (current + 1) % slides.length)}
        onTogglePause={() => setPaused((value) => !value)}
      />
    </section>
  );
}

function BannerControls({
  countLabel,
  paused,
  onPrevious,
  onNext,
  onTogglePause
}: {
  countLabel: string;
  paused: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePause: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 md:bottom-5 lg:bottom-7">
      <BannerRoundButton label="Previous banner" onClick={onPrevious}>
        <ArrowLeft className="h-6 w-6" aria-hidden="true" />
      </BannerRoundButton>
      <span className="min-w-14 text-center text-xl font-medium text-black/55">
        {countLabel}
      </span>
      <BannerRoundButton label="Next banner" onClick={onNext}>
        <ArrowRight className="h-6 w-6" aria-hidden="true" />
      </BannerRoundButton>
      <BannerRoundButton
        label={paused ? "Play banner rotation" : "Pause banner rotation"}
        onClick={onTogglePause}
      >
        {paused ? (
          <Play className="h-6 w-6 fill-current" aria-hidden="true" />
        ) : (
          <Pause className="h-6 w-6 fill-current" aria-hidden="true" />
        )}
      </BannerRoundButton>
    </div>
  );
}

function BannerRoundButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="focus-ring inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/15 text-white transition hover:bg-black/25 md:h-14 md:w-14"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
