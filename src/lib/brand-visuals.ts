import type { ProductCollectionSlug } from "@/lib/products";

export type CollectionVisual = {
  label: string;
  themeWord: string;
  productType: string;
  bgClass: string;
  accentClass: string;
  saleClass: string;
  stickerPath: string;
};

const defaultVisual: CollectionVisual = {
  label: "shipK",
  themeWord: "K-LOOK",
  productType: "SEOUL DROP",
  bgClass: "bg-[#fff8f0]",
  accentClass: "text-[#ff3d7f]",
  saleClass: "bg-[#ff6447]",
  stickerPath: "/shipk-brand/stickers/user-random/cherry.jpg"
};

export const collectionVisuals: Record<ProductCollectionSlug, CollectionVisual> = {
  "daily-glow": {
    label: "Daily Glow",
    themeWord: "DAILY",
    productType: "STARTER PICK",
    bgClass: "bg-[#ffd6e3]",
    accentClass: "text-[#ff3d7f]",
    saleClass: "bg-[#ff6447]",
    stickerPath: "/shipk-brand/stickers/user-random/cherry.jpg"
  },
  "k-pop-idol": {
    label: "K-Pop Idol",
    themeWord: "IDOL",
    productType: "TREND EDIT",
    bgClass: "bg-[#ffe25a]",
    accentClass: "text-[#793de1]",
    saleClass: "bg-[#ef76a9]",
    stickerPath: "/shipk-brand/stickers/user-random/pink-star.jpg"
  },
  "glass-skin": {
    label: "Glass Skin",
    themeWord: "GLASS",
    productType: "GLOW KIT",
    bgClass: "bg-[#b4f0dc]",
    accentClass: "text-[#138a64]",
    saleClass: "bg-[#ff6447]",
    stickerPath: "/shipk-brand/stickers/user-random/rainbow.jpg"
  },
  "y2k-cute": {
    label: "Y2K Cute",
    themeWord: "Y2K",
    productType: "PLAY KIT",
    bgClass: "bg-[#c8f26c]",
    accentClass: "text-[#ff3d7f]",
    saleClass: "bg-[#ef76a9]",
    stickerPath: "/shipk-brand/stickers/user-random/unicorn.jpg"
  },
  "cool-tone": {
    label: "Cool Tone",
    themeWord: "COOL",
    productType: "COOL EDIT",
    bgClass: "bg-[#bde0fe]",
    accentClass: "text-[#2563b7]",
    saleClass: "bg-[#793de1]",
    stickerPath: "/shipk-brand/stickers/user-random/purple-star.jpg"
  },
  "warm-tone": {
    label: "Warm Tone",
    themeWord: "WARM",
    productType: "WARM EDIT",
    bgClass: "bg-[#ff7a5c]",
    accentClass: "text-[#c24a2c]",
    saleClass: "bg-[#ff6447]",
    stickerPath: "/shipk-brand/stickers/user-random/yellow-star.jpg"
  },
  "date-night": {
    label: "Date Night",
    themeWord: "DATE",
    productType: "NIGHT KIT",
    bgClass: "bg-[#d8c2ff]",
    accentClass: "text-[#793de1]",
    saleClass: "bg-[#ef76a9]",
    stickerPath: "/shipk-brand/stickers/user-random/perfume.jpg"
  }
};

export const stickerCloud = [
  {
    src: "/shipk-brand/stickers/user-random/cherry.jpg",
    className: "left-2 top-10 hidden w-16 rotate-[-8deg] md:block"
  },
  {
    src: "/shipk-brand/stickers/user-random/palette.jpg",
    className: "right-8 top-24 hidden w-20 rotate-[8deg] lg:block"
  },
  {
    src: "/shipk-brand/stickers/user-random/pink-star.jpg",
    className: "right-24 bottom-10 hidden w-12 rotate-[-12deg] md:block"
  }
] as const;

export function getCollectionVisual(slug?: ProductCollectionSlug | string | null) {
  if (!slug || !(slug in collectionVisuals)) {
    return defaultVisual;
  }

  return collectionVisuals[slug as ProductCollectionSlug];
}

export function getProductRank(index: number) {
  return `#${index + 1}`;
}
