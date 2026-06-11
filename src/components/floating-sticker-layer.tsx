"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useState } from "react";

type StickerSize = "small" | "medium" | "large";
type StickerSlot = {
  top: number;
  side: "left" | "right";
  size: StickerSize;
  rotate: number;
};
type StickerPlacement = StickerSlot & {
  src: string;
  width: number;
  rotateWithJitter: number;
  topWithJitter: number;
};
type StickerVariant =
  | "home"
  | "makeup"
  | "shop"
  | "product"
  | "auth"
  | "checkout"
  | "promoter"
  | "about";

const floatingStickerPool = [
  { src: "/shipk-brand/stickers/user-random/cherry.jpg", size: "medium" },
  { src: "/shipk-brand/stickers/user-random/rabbit.jpg", size: "medium" },
  { src: "/shipk-brand/stickers/user-random/purple-star.jpg", size: "small" },
  { src: "/shipk-brand/stickers/user-random/yellow-star.jpg", size: "small" },
  { src: "/shipk-brand/stickers/user-random/pink-star.jpg", size: "small" },
  { src: "/shipk-brand/stickers/user-random/palette.jpg", size: "medium" },
  { src: "/shipk-brand/stickers/user-random/dog.jpg", size: "medium" },
  { src: "/shipk-brand/stickers/user-random/rainbow.jpg", size: "medium" },
  { src: "/shipk-brand/stickers/user-random/bear.jpg", size: "large" },
  { src: "/shipk-brand/stickers/user-random/unicorn.jpg", size: "large" },
  { src: "/shipk-brand/stickers/user-random/perfume.jpg", size: "medium" },
  { src: "/shipk-brand/stickers/user-random/bracelet.jpg", size: "medium" },
] satisfies Array<{ src: string; size: StickerSize }>;

const stickerWidths: Record<StickerSize, number> = {
  small: 70,
  medium: 94,
  large: 122,
};
const minimumStickerGap = 88;

const stickerSlots: Record<StickerVariant, StickerSlot[]> = {
  home: [
    { top: 26, side: "left", size: "small", rotate: -9 },
    { top: 148, side: "right", size: "large", rotate: 9 },
    { top: 560, side: "left", size: "medium", rotate: 7 },
    { top: 940, side: "right", size: "small", rotate: -6 },
  ],
  makeup: [
    { top: 34, side: "left", size: "medium", rotate: -8 },
    { top: 294, side: "right", size: "small", rotate: 7 },
    { top: 710, side: "left", size: "medium", rotate: -6 },
    { top: 1080, side: "right", size: "medium", rotate: 6 },
  ],
  shop: [
    { top: 22, side: "left", size: "small", rotate: -9 },
    { top: 286, side: "right", size: "small", rotate: 8 },
    { top: 730, side: "left", size: "medium", rotate: -6 },
    { top: 1110, side: "right", size: "medium", rotate: 6 },
  ],
  product: [
    { top: 154, side: "right", size: "large", rotate: 9 },
    { top: 540, side: "left", size: "medium", rotate: -8 },
    { top: 780, side: "right", size: "small", rotate: 8 },
    { top: 1110, side: "right", size: "medium", rotate: -5 },
  ],
  auth: [
    { top: 46, side: "left", size: "medium", rotate: -7 },
    { top: 318, side: "right", size: "small", rotate: 10 },
  ],
  checkout: [
    { top: 36, side: "right", size: "small", rotate: 8 },
    { top: 410, side: "left", size: "small", rotate: -6 },
  ],
  promoter: [
    { top: 76, side: "left", size: "medium", rotate: -7 },
    { top: 410, side: "right", size: "small", rotate: 10 },
    { top: 760, side: "left", size: "large", rotate: 5 },
  ],
  about: [
    { top: 56, side: "right", size: "small", rotate: 8 },
    { top: 360, side: "left", size: "medium", rotate: -5 },
    { top: 820, side: "right", size: "large", rotate: 6 },
  ],
};

export function FloatingStickerLayer() {
  const pathname = usePathname();
  const variant = useMemo(() => getStickerVariant(pathname), [pathname]);
  const [placements, setPlacements] = useState<StickerPlacement[]>([]);

  useLayoutEffect(() => {
    if (!variant) {
      setPlacements([]);
      return;
    }

    const slots = shuffleList(stickerSlots[variant]);
    const stickers = shuffleList(floatingStickerPool);
    const nextPlacements = slots.map((slot, index) => {
      const sticker = stickers[index % stickers.length];
      const size = slot.size || sticker.size;

      return {
        ...slot,
        src: sticker.src,
        width: stickerWidths[size],
        rotateWithJitter: slot.rotate + Math.random() * 6 - 3,
        topWithJitter: Math.max(0, slot.top + Math.random() * 28 - 14),
      };
    });

    setPlacements(spaceStickerPlacements(nextPlacements));
  }, [variant]);

  if (!placements.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-visible md:block"
      aria-hidden="true"
      data-testid="floating-sticker-layer"
    >
      {placements.map((sticker, index) => (
        <Image
          key={`${sticker.src}-${index}`}
          src={sticker.src}
          alt=""
          width={140}
          height={140}
          sizes={`${sticker.width}px`}
          priority
          unoptimized
          data-testid="floating-sticker"
          className="shipk-floating-sticker absolute h-auto"
          style={{
            top: sticker.topWithJitter,
            width: sticker.width,
            transform: `rotate(${sticker.rotateWithJitter}deg)`,
            ...(sticker.side === "left"
              ? { left: "max(12px, calc(50% - 710px))" }
              : { right: "max(12px, calc(50% - 710px))" }),
          }}
        />
      ))}
    </div>
  );
}

function getStickerVariant(pathname: string): StickerVariant | null {
  if (pathname === "/") {
    return "home";
  }
  if (pathname.startsWith("/makeup")) {
    return "makeup";
  }
  if (pathname.startsWith("/shop")) {
    return "shop";
  }
  if (pathname.startsWith("/products/")) {
    return "product";
  }
  if (pathname.startsWith("/auth")) {
    return "auth";
  }
  if (pathname.startsWith("/checkout")) {
    return "checkout";
  }
  if (pathname.startsWith("/promoter")) {
    return "promoter";
  }
  if (pathname.startsWith("/account")) {
    return null;
  }
  if (pathname.startsWith("/about")) {
    return "about";
  }
  return null;
}

function shuffleList<T>(items: readonly T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function spaceStickerPlacements(placements: StickerPlacement[]) {
  const spaced = [...placements];

  (["left", "right"] as const).forEach((side) => {
    const sidePlacements = spaced
      .map((placement, index) => ({ placement, index }))
      .filter(({ placement }) => placement.side === side)
      .sort((a, b) => a.placement.topWithJitter - b.placement.topWithJitter);

    let previousBottom = -Infinity;

    sidePlacements.forEach(({ placement, index }) => {
      const topWithSpacing = Math.max(
        placement.topWithJitter,
        previousBottom + minimumStickerGap,
      );

      spaced[index] = {
        ...placement,
        topWithJitter: topWithSpacing,
      };
      previousBottom = topWithSpacing + placement.width;
    });
  });

  return spaced;
}
