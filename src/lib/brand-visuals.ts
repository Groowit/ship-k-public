import type { Product } from "@/lib/products";

export type ProductVisual = {
  label: string;
  themeWord: string;
  productType: string;
  bgClass: string;
  accentClass: string;
  saleClass: string;
  stickerPath: string;
};

const defaultVisual: ProductVisual = {
  label: "shipK",
  themeWord: "K-BEAUTY",
  productType: "SEOUL DROP",
  bgClass: "bg-[#fff8f0]",
  accentClass: "text-[#ff3d7f]",
  saleClass: "bg-[#ff6447]",
  stickerPath: "/shipk-brand/stickers/user-random/cherry.jpg"
};

const productVisuals: Record<Product["productType"], Record<Product["category"], ProductVisual>> = {
  set: {
    Skincare: {
      label: "Skincare",
      themeWord: "SKINCARE",
      productType: "SKINCARE SET",
      bgClass: "bg-[#b4f0dc]",
      accentClass: "text-[#138a64]",
      saleClass: "bg-[#ff6447]",
      stickerPath: "/shipk-brand/stickers/user-random/rainbow.jpg"
    },
    Makeup: {
      label: "Makeup",
      themeWord: "MAKEUP",
      productType: "MAKEUP SET",
      bgClass: "bg-[#ffe25a]",
      accentClass: "text-[#793de1]",
      saleClass: "bg-[#ef76a9]",
      stickerPath: "/shipk-brand/stickers/user-random/pink-star.jpg"
    }
  },
  single: {
    Skincare: {
      label: "Skincare",
      themeWord: "SKINCARE",
      productType: "SKINCARE PRODUCT",
      bgClass: "bg-[#ffd6e3]",
      accentClass: "text-[#ff3d7f]",
      saleClass: "bg-[#ff6447]",
      stickerPath: "/shipk-brand/stickers/user-random/cherry.jpg"
    },
    Makeup: {
      label: "Makeup",
      themeWord: "MAKEUP",
      productType: "MAKEUP PRODUCT",
      bgClass: "bg-[#c8f26c]",
      accentClass: "text-[#ff3d7f]",
      saleClass: "bg-[#ef76a9]",
      stickerPath: "/shipk-brand/stickers/user-random/palette.jpg"
    }
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

export function getProductVisual(product?: Pick<Product, "productType" | "category"> | null) {
  if (!product) {
    return defaultVisual;
  }

  return productVisuals[product.productType]?.[product.category] ?? defaultVisual;
}

export function getProductRank(index: number) {
  return `#${index + 1}`;
}
