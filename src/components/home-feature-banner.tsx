"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBalancedBannerTextLines } from "@/lib/banner-text";
import { getImageOptimizationProps } from "@/lib/image-path";
import type { HomeBannerFontKey, HomeBannerTextColor } from "@/lib/home-banners";
import { cn } from "@/lib/utils";

const bannerThemes = [
  {
    eyebrow: "TODAY'S FOCUS",
    headline: "Build a dewy set in one day",
    background: "from-[#ffe7cf] via-[#ffd2ad] to-[#bdeff2]",
    glow: "bg-[#ff7a5c]",
    controlTone: "dark"
  },
  {
    eyebrow: "SEOUL ROUTINE",
    headline: "Keep skin prep simple",
    background: "from-[#ffe25a] via-[#ffd6e3] to-[#bde0fe]",
    glow: "bg-[#ff3d7f]",
    controlTone: "dark"
  },
  {
    eyebrow: "SKINCARE",
    headline: "Start skin prep the easy way",
    background: "from-[#dcfff4] via-[#bde0fe] to-[#fff8f0]",
    glow: "bg-[#49c6a3]",
    controlTone: "dark"
  }
] as const;

type BannerControlTone = "dark" | "light";

export type HomeBannerSlide = {
  id: string;
  topic: string;
  headline: string;
  description: string;
  backgroundImagePath?: string;
  sideImagePath?: string;
  linkPath: string;
  fontKey: HomeBannerFontKey;
  textColor: HomeBannerTextColor;
  topicTextColor: HomeBannerTextColor;
  headlineTextColor: HomeBannerTextColor;
  descriptionTextColor: HomeBannerTextColor;
};

const fontClassByKey: Record<HomeBannerFontKey, string> = {
  "brand-display": "font-brand-heavy",
  "black-sans": "font-black",
  "standard-sans": "font-semibold"
};

const textColorClassByKey: Record<
  HomeBannerTextColor,
  {
    eyebrow: string;
    headline: string;
    body: string;
    overlay: string;
  }
> = {
  black: {
    eyebrow: "text-black",
    headline: "text-[#1c1c1c]",
    body: "text-black/60",
    overlay: "bg-white/58"
  },
  white: {
    eyebrow: "text-white",
    headline: "text-white",
    body: "text-white/80",
    overlay: "bg-black/40"
  },
  "shipk-pink": {
    eyebrow: "text-[#ff3d7f]",
    headline: "text-[#ff3d7f]",
    body: "text-[#8a2448]",
    overlay: "bg-white/62"
  },
  teal: {
    eyebrow: "text-[#087f6f]",
    headline: "text-[#087f6f]",
    body: "text-[#245b53]",
    overlay: "bg-white/60"
  },
  coral: {
    eyebrow: "text-[#f05d5e]",
    headline: "text-[#d93f45]",
    body: "text-[#8a3939]",
    overlay: "bg-white/62"
  },
  "muted-dark": {
    eyebrow: "text-zinc-700",
    headline: "text-zinc-800",
    body: "text-zinc-600",
    overlay: "bg-white/64"
  }
};

const controlToneClassByTone: Record<
  BannerControlTone,
  {
    container: string;
    button: string;
  }
> = {
  dark: {
    container:
      "bg-white/[0.28] text-zinc-950 ring-1 ring-white/45",
    button: "hover:bg-white/[0.22]"
  },
  light: {
    container:
      "bg-black/[0.18] text-white ring-1 ring-white/25",
    button: "hover:bg-white/[0.16]"
  }
};

export function HomeFeatureBanner({ banners }: { banners: HomeBannerSlide[] }) {
  const slides = useMemo(() => banners, [banners]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [motionDirection, setMotionDirection] = useState<"next" | "previous">("next");
  const [paused, setPaused] = useState(false);
  const banner = slides[activeIndex] ?? slides[0] ?? null;
  const theme = bannerThemes[activeIndex % bannerThemes.length];
  const { controlTone, controlsRef, sectionRef } = useBannerControlTone(banner, theme.controlTone);

  useIdleBannerImagePreload(slides);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setMotionDirection("next");
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!banner) {
    return null;
  }

  const countLabel = `${activeIndex + 1}/${slides.length}`;
  const topicColor = textColorClassByKey[banner.topicTextColor];
  const headlineColor = textColorClassByKey[banner.headlineTextColor];
  const descriptionColor = textColorClassByKey[banner.descriptionTextColor];
  const sideImagePath = banner.sideImagePath;
  const hasSideImage = Boolean(sideImagePath);
  const hasTopic = Boolean(banner.topic.trim());
  const hasHeadline = Boolean(banner.headline.trim());
  const hasDescription = Boolean(banner.description.trim());
  const hasCopy = hasTopic || hasHeadline || hasDescription;
  const bannerLabel = getBannerLinkLabel(banner);
  const isFirstBanner = activeIndex === 0;
  const prioritizeBackgroundImage = isFirstBanner && Boolean(banner.backgroundImagePath);
  const prioritizeSideImage = isFirstBanner && !banner.backgroundImagePath && hasSideImage;
  const copyWidthClass =
    banner.backgroundImagePath
      ? "w-[calc(50vw-2rem)] max-w-[40rem] min-w-0 sm:w-[calc(50vw-3rem)] md:w-[calc(50vw-4rem)] lg:w-[calc(50vw-6rem)]"
      : "max-w-2xl";
  const descriptionWidthClass = banner.backgroundImagePath
    ? "max-w-full break-words"
    : "max-w-[34rem] md:max-w-[38rem] xl:max-w-[40rem]";

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative overflow-hidden border-y border-zinc-200",
        banner.backgroundImagePath ? "bg-white" : cn("bg-gradient-to-r", theme.background)
      )}
      aria-label="Featured product banner"
    >
      {banner.backgroundImagePath ? (
        <>
          <Image
            src={banner.backgroundImagePath}
            alt=""
            fill
            priority={prioritizeBackgroundImage}
            {...getImageOptimizationProps(banner.backgroundImagePath)}
            sizes="100vw"
            className="object-cover"
            aria-hidden="true"
          />
          {hasCopy ? <div className={cn("absolute inset-0", headlineColor.overlay)} aria-hidden="true" /> : null}
        </>
      ) : null}
      {hasSideImage ? (
        <div className="absolute inset-y-0 right-0 hidden w-[48%] bg-white/20 backdrop-blur-[1px] lg:block" />
      ) : null}
      <Link
        href={banner.linkPath}
        aria-label={bannerLabel}
        className={cn(
          "focus-ring relative z-10 mx-auto grid min-h-[26rem] w-full max-w-[1920px] cursor-pointer items-center gap-6 px-8 py-8 sm:px-12 md:min-h-[34rem] md:px-16 md:py-14 lg:min-h-[36rem] lg:px-24 lg:py-16",
          hasCopy && hasSideImage ? "lg:grid-cols-[0.9fr_1.1fr]" : "lg:grid-cols-[minmax(0,0.95fr)]"
        )}
      >
        {hasCopy ? (
          <div
            key={banner.id}
            data-home-banner-copy
            data-banner-motion-direction={motionDirection}
            className={cn(
              "shipk-banner-copy-enter relative z-10 w-full",
              copyWidthClass
            )}
          >
            {hasTopic ? (
              <p className={cn("text-lg md:text-xl", fontClassByKey[banner.fontKey], topicColor.eyebrow)}>
                {banner.topic}
              </p>
            ) : null}
            {hasHeadline ? (
              <h1
                className={cn(
                  hasTopic ? "mt-7" : "",
                  "max-w-[14ch] break-words text-4xl leading-[1.12] tracking-normal [word-break:keep-all] sm:text-5xl md:text-6xl",
                  fontClassByKey[banner.fontKey],
                  headlineColor.headline
                )}
              >
                {banner.headline}
              </h1>
            ) : null}
            {hasDescription ? (
              <p
                className={cn(
                  hasTopic || hasHeadline ? "mt-5" : "",
                  "text-sm font-black leading-5 sm:text-lg sm:leading-7 md:text-xl",
                  descriptionWidthClass,
                  descriptionColor.body
                )}
              >
                {getBalancedBannerTextLines(banner.description).map((line, index) => (
                  <span className="block" key={`${index}-${line}`}>
                    {line}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        ) : null}
        {sideImagePath ? (
          <div className="relative z-10 min-h-[18rem] md:min-h-[27rem] lg:min-h-[30rem]">
            <div className="absolute inset-0 block overflow-hidden rounded-md">
              <span
                className={cn(
                  "absolute bottom-4 right-6 h-52 w-52 rounded-full opacity-40 blur-3xl md:h-80 md:w-80",
                  theme.glow
                )}
                aria-hidden="true"
              />
              <Image
                src={sideImagePath}
                alt={hasHeadline ? `${banner.headline} banner image` : "Banner image"}
                fill
                priority={prioritizeSideImage}
                {...getImageOptimizationProps(sideImagePath)}
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-contain object-top px-4 pb-20 pt-3 md:px-8 md:pb-24 md:pt-5 lg:px-12 lg:pb-28 lg:pt-6"
              />
            </div>
          </div>
        ) : null}
      </Link>
      {slides.length > 1 ? (
        <BannerControls
          controlTone={controlTone}
          controlsRef={controlsRef}
          countLabel={countLabel}
          paused={paused}
          onPrevious={() => {
            setMotionDirection("previous");
            setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
          }}
          onNext={() => {
            setMotionDirection("next");
            setActiveIndex((current) => (current + 1) % slides.length);
          }}
          onTogglePause={() => setPaused((value) => !value)}
        />
      ) : null}
    </section>
  );
}

function BannerControls({
  controlTone,
  controlsRef,
  countLabel,
  paused,
  onPrevious,
  onNext,
  onTogglePause
}: {
  controlTone: BannerControlTone;
  controlsRef: React.RefObject<HTMLDivElement | null>;
  countLabel: string;
  paused: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePause: () => void;
}) {
  const toneClass = controlToneClassByTone[controlTone];

  return (
    <div
      ref={controlsRef}
      className={cn(
        "absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-0.5 rounded-full px-2 py-1 backdrop-blur-2xl backdrop-saturate-150 transition-[background-color,color] duration-300 md:bottom-4 md:gap-1 lg:bottom-5",
        toneClass.container
      )}
    >
      <BannerRoundButton buttonClassName={toneClass.button} label="Previous banner" onClick={onPrevious}>
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </BannerRoundButton>
      <span className="min-w-10 px-1 text-center text-base font-black text-current md:min-w-12 md:text-lg">
        {countLabel}
      </span>
      <BannerRoundButton buttonClassName={toneClass.button} label="Next banner" onClick={onNext}>
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </BannerRoundButton>
      <BannerRoundButton
        buttonClassName={toneClass.button}
        label={paused ? "Play banner rotation" : "Pause banner rotation"}
        onClick={onTogglePause}
      >
        {paused ? (
          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
        ) : (
          <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
        )}
      </BannerRoundButton>
    </div>
  );
}

function getBannerLinkLabel(banner: HomeBannerSlide) {
  const label = [banner.headline, banner.topic, banner.description]
    .map((value) => value.trim())
    .find(Boolean);

  return label ? `Open banner: ${label}` : "Open banner";
}

function BannerRoundButton({
  buttonClassName,
  label,
  onClick,
  children
}: {
  buttonClassName: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring inline-flex h-11 w-10 items-center justify-center rounded-full bg-transparent text-current transition duration-150 hover:scale-105 active:scale-110 md:w-11",
        buttonClassName
      )}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function useBannerControlTone(
  banner: HomeBannerSlide | null,
  fallbackTone: BannerControlTone
) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [controlTone, setControlTone] = useState<BannerControlTone>(fallbackTone);

  useEffect(() => {
    const nextFallbackTone = getFallbackControlTone(banner, fallbackTone);
    setControlTone(nextFallbackTone);

    if (!banner?.backgroundImagePath || typeof window === "undefined") {
      return;
    }

    const section = sectionRef.current;
    const controls = controlsRef.current;

    if (!section || !controls) {
      return;
    }

    const image = new window.Image();
    let cancelled = false;

    const updateToneFromImage = () => {
      if (cancelled) {
        return;
      }

      const luminance = sampleControlBackdropLuminance(image, section, controls);

      if (luminance === null) {
        return;
      }

      setControlTone(luminance > 0.54 ? "dark" : "light");
    };

    const keepFallbackTone = () => {
      if (!cancelled) {
        setControlTone(nextFallbackTone);
      }
    };

    image.crossOrigin = "anonymous";
    image.addEventListener("load", updateToneFromImage);
    image.addEventListener("error", keepFallbackTone);
    image.src = banner.backgroundImagePath;

    if (image.complete && image.naturalWidth > 0) {
      updateToneFromImage();
    }

    return () => {
      cancelled = true;
      image.removeEventListener("load", updateToneFromImage);
      image.removeEventListener("error", keepFallbackTone);
    };
  }, [banner, fallbackTone]);

  return { controlTone, controlsRef, sectionRef };
}

function useIdleBannerImagePreload(slides: HomeBannerSlide[]) {
  useEffect(() => {
    if (typeof window === "undefined" || slides.length <= 1) {
      return;
    }

    const imagePaths = getDeferredBannerImagePaths(slides);

    if (!imagePaths.length) {
      return;
    }

    let cancelled = false;

    const preloadImages = () => {
      if (cancelled) {
        return;
      }

      for (const imagePath of imagePaths) {
        const image = new window.Image();
        image.decoding = "async";
        image.src = imagePath;
      }
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const requestIdleCallback = idleWindow.requestIdleCallback as (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      const idleHandle = requestIdleCallback(preloadImages, { timeout: 2500 });

      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(idleHandle);
      };
    }

    const timeoutHandle = window.setTimeout(preloadImages, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutHandle);
    };
  }, [slides]);
}

function getDeferredBannerImagePaths(slides: HomeBannerSlide[]) {
  const imagePaths = new Set<string>();

  for (const slide of slides.slice(1)) {
    if (slide.backgroundImagePath) {
      imagePaths.add(slide.backgroundImagePath);
    }

    if (slide.sideImagePath) {
      imagePaths.add(slide.sideImagePath);
    }
  }

  return [...imagePaths];
}

function getFallbackControlTone(
  banner: HomeBannerSlide | null,
  fallbackTone: BannerControlTone
): BannerControlTone {
  if (!banner?.backgroundImagePath) {
    return fallbackTone;
  }

  if (
    banner.topicTextColor === "white" ||
    banner.headlineTextColor === "white" ||
    banner.descriptionTextColor === "white"
  ) {
    return "light";
  }

  return fallbackTone;
}

function sampleControlBackdropLuminance(
  image: HTMLImageElement,
  section: HTMLElement,
  controls: HTMLDivElement
) {
  try {
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      return null;
    }

    const sectionRect = section.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();

    if (!sectionRect.width || !sectionRect.height || !controlsRect.width || !controlsRect.height) {
      return null;
    }

    const coverScale = Math.max(sectionRect.width / naturalWidth, sectionRect.height / naturalHeight);
    const renderedWidth = naturalWidth * coverScale;
    const renderedHeight = naturalHeight * coverScale;
    const offsetX = (sectionRect.width - renderedWidth) / 2;
    const offsetY = (sectionRect.height - renderedHeight) / 2;
    const controlCenterX = controlsRect.left + controlsRect.width / 2 - sectionRect.left;
    const controlCenterY = controlsRect.top + controlsRect.height / 2 - sectionRect.top;
    const sampleWidth = Math.max(controlsRect.width * 1.35, 180);
    const sampleHeight = Math.max(controlsRect.height * 1.55, 64);
    const sourceX = clamp((controlCenterX - sampleWidth / 2 - offsetX) / coverScale, 0, naturalWidth - 1);
    const sourceY = clamp((controlCenterY - sampleHeight / 2 - offsetY) / coverScale, 0, naturalHeight - 1);
    const sourceWidth = clamp(sampleWidth / coverScale, 1, naturalWidth - sourceX);
    const sourceHeight = clamp(sampleHeight / coverScale, 1, naturalHeight - sourceY);
    const canvas = document.createElement("canvas");
    const sampleCanvasWidth = 32;
    const sampleCanvasHeight = 16;

    canvas.width = sampleCanvasWidth;
    canvas.height = sampleCanvasHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return null;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sampleCanvasWidth,
      sampleCanvasHeight
    );

    const { data } = context.getImageData(0, 0, sampleCanvasWidth, sampleCanvasHeight);
    let luminanceTotal = 0;
    let pixelCount = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;

      if (alpha < 0.1) {
        continue;
      }

      luminanceTotal += getRelativeLuminance(data[index], data[index + 1], data[index + 2]);
      pixelCount += 1;
    }

    if (!pixelCount) {
      return null;
    }

    return luminanceTotal / pixelCount;
  } catch {
    return null;
  }
}

function getRelativeLuminance(red: number, green: number, blue: number) {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((value) => {
    const channel = value / 255;

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
