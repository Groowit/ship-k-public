"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type React from "react";
import { getProductVisual } from "@/lib/brand-visuals";
import { getImageOptimizationProps } from "@/lib/image-path";
import { getProductPriceLabel, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const dragActivationDistance = 16;

export function HomeCurationRail({ products }: { products: Product[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const pointerStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const resumeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let lastTime = performance.now();
    const speed = 0.018;

    function tick(time: number) {
      const currentRail = railRef.current;
      if (!currentRail) {
        return;
      }

      const delta = time - lastTime;
      lastTime = time;
      const maxScrollLeft = currentRail.scrollWidth - currentRail.clientWidth;

      if (!isPausedRef.current && maxScrollLeft > 1) {
        const nextLeft = currentRail.scrollLeft + delta * speed;
        if (nextLeft >= maxScrollLeft) {
          currentRail.scrollLeft = maxScrollLeft;
          isPausedRef.current = true;
        } else {
          currentRail.scrollLeft = nextLeft;
        }
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  function pause() {
    isPausedRef.current = true;
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }

  function resumeSoon(delay = 1400) {
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = window.setTimeout(() => {
      if (!isPointerDownRef.current && !railRef.current?.contains(document.activeElement)) {
        isPausedRef.current = false;
      }
    }, delay);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    pause();
    isPointerDownRef.current = true;
    pointerStartXRef.current = event.clientX;
    scrollStartRef.current = rail.scrollLeft;
    dragDistanceRef.current = 0;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || !isPointerDownRef.current) {
      return;
    }

    const delta = event.clientX - pointerStartXRef.current;
    if (!Number.isFinite(delta)) {
      return;
    }

    dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.abs(delta));
    if (dragDistanceRef.current <= dragActivationDistance) {
      return;
    }

    if (!rail.hasPointerCapture(event.pointerId)) {
      rail.setPointerCapture(event.pointerId);
    }

    rail.scrollLeft = scrollStartRef.current - delta;
  }

  function endPointerInteraction(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || !isPointerDownRef.current) {
      return;
    }

    isPointerDownRef.current = false;
    if (rail.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }
    resumeSoon();
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragDistanceRef.current > dragActivationDistance) {
      event.preventDefault();
      event.stopPropagation();
      dragDistanceRef.current = 0;
    }
  }

  if (!products.length) {
    return null;
  }

  return (
    <div
      ref={railRef}
      data-testid="home-curation-rail"
      className="flex cursor-grab touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-auto pb-4 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerInteraction}
      onPointerCancel={endPointerInteraction}
      onClickCapture={handleClickCapture}
      onMouseEnter={pause}
      onMouseLeave={() => resumeSoon()}
      onWheel={() => {
        pause();
        resumeSoon(2200);
      }}
      onFocusCapture={pause}
      onBlurCapture={() => resumeSoon()}
      aria-label="Curated for you products"
    >
      {products.map((product, index) => (
        <CuratedProductCard key={product.id} product={product} priority={index < 2} />
      ))}
    </div>
  );
}

function CuratedProductCard({
  product,
  priority
}: {
  product: Product;
  priority: boolean;
}) {
  const visual = getProductVisual(product);
  const primaryTag = product.tags[0] ?? visual.themeWord;
  const itemCountLabel = product.itemCount ? `${product.itemCount} items` : product.category;

  return (
    <a
      href={`/products/${product.slug}`}
      className="group block w-[72vw] max-w-[18rem] shrink-0 snap-start rounded-md focus-ring sm:w-[17rem] lg:w-[18rem]"
      aria-label={`${product.name} ${getProductPriceLabel(product)}`}
    >
      <article className="grid h-full gap-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <span className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2.5 py-1 text-xs font-black uppercase text-black">
            {visual.productType}
          </span>
          <span className="absolute bottom-3 left-3 z-10 max-w-[9rem] rounded-md bg-black px-3 py-2 text-xs font-black uppercase leading-tight text-white">
            {primaryTag}
          </span>
          <Image
            src={product.heroImagePath}
            alt={`${product.name} curated product image`}
            fill
            priority={priority}
            {...getImageOptimizationProps(product.heroImagePath)}
            sizes="(min-width: 1024px) 18rem, (min-width: 640px) 17rem, 72vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="grid gap-2">
          <p className={cn("text-xs font-black uppercase", visual.accentClass)}>
            {product.category} / {product.brandName}
          </p>
          <h3 className="line-clamp-2 min-h-12 text-lg font-black leading-6 text-[#1f1f1f]">
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-3">
            <p className="font-brand-heavy text-lg text-[#f02525]">
              {getProductPriceLabel(product)}
            </p>
            <p className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">
              {itemCountLabel}
            </p>
          </div>
        </div>
      </article>
    </a>
  );
}
