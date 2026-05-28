"use client";

import type React from "react";
import Image from "next/image";
import { BadgeDollarSign, ShieldCheck, Truck } from "lucide-react";
import { BuyBox } from "@/components/buy-box";
import { ProductDetailSectionsRenderer } from "@/components/product-detail-sections-renderer";
import { Badge } from "@/components/ui/badge";
import { getCollectionVisual } from "@/lib/brand-visuals";
import { formatUsd } from "@/lib/commerce";
import { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductDetailView({
  product,
  isAuthenticated,
  previewMode = false
}: {
  product: Product;
  isAuthenticated: boolean;
  previewMode?: boolean;
}) {
  const visual = getCollectionVisual(product.collectionSlug);

  return (
    <article className="overflow-hidden">
      <section className="container grid gap-9 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid content-start gap-4">
          <div className="shipk-surface overflow-hidden rounded-md">
            <IntroMedia product={product} visualClassName={visual.bgClass} />
          </div>
          {product.galleryImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {product.galleryImages.slice(0, 6).map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-md border-2 border-black bg-white"
                >
                  <Image
                    src={image.imagePath}
                    alt={image.altText}
                    fill
                    sizes="(min-width: 1024px) 16vw, 33vw"
                    className="object-contain p-2"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid content-start gap-6">
          <div>
            <div className="flex flex-wrap gap-2">
              {product.badges.map((badge) => (
                <Badge key={badge} className="rounded-full border-2 border-black bg-[#ffe25a] text-foreground">
                  {badge}
                </Badge>
              ))}
              {product.itemCount ? <Badge>{product.itemCount} items</Badge> : null}
              {product.difficulty ? <Badge className="bg-[#bde0fe]">{product.difficulty}</Badge> : null}
              {product.option.stockQuantity === 0 ? <Badge>Out of stock</Badge> : null}
            </div>
            <p className="mt-6 text-sm font-black text-muted-foreground">
              Shop / {product.collectionName ?? product.brandName}
            </p>
            <h1 className="mt-2 shipk-heading text-5xl leading-none">{product.name}</h1>
            {product.result ? (
              <p className="mt-3 font-brand-script text-3xl leading-tight text-[#ff3d7f]">
                {product.result}
              </p>
            ) : null}
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {product.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="shipk-chip h-9 min-h-9 px-3 py-1 text-xs">Ships from Korea</span>
              <span className="shipk-chip h-9 min-h-9 bg-[#b4f0dc] px-3 py-1 text-xs">PayPal checkout</span>
              <span className="shipk-chip h-9 min-h-9 bg-[#c8f26c] px-3 py-1 text-xs">Free shipping over $75</span>
            </div>
            <p className="mt-6 font-brand-heavy text-3xl text-foreground">
              {formatUsd(product.option.priceCents)}
            </p>
          </div>
          {previewMode ? (
            <PreviewBuyBox product={product} />
          ) : (
            <BuyBox product={product} isAuthenticated={isAuthenticated} />
          )}
        </div>
      </section>

      <section className="border-y-2 border-black bg-[#b4f0dc]">
        <div className="container grid gap-4 py-6 md:grid-cols-3">
          <TrustPanel
            icon={<Truck className="h-5 w-5" />}
            title="Korea to the U.S."
            body="Shipping fees and customs notes stay visible before payment."
          />
          <TrustPanel
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Secure checkout"
            body="PayPal is the secure payment provider for this checkout flow."
          />
          <TrustPanel
            icon={<BadgeDollarSign className="h-5 w-5" />}
            title="$75 free shipping"
            body="Orders below the threshold use the standard shipping fee shown at checkout."
          />
        </div>
      </section>

      <ProductDetailSectionsRenderer product={product} />
    </article>
  );
}

function IntroMedia({
  product,
  visualClassName
}: {
  product: Product;
  visualClassName: string;
}) {
  if (product.introVideoUrl) {
    return (
      <div className="overflow-hidden bg-foreground">
        <div className="aspect-video">
          <iframe
            src={product.introVideoUrl}
            title={`${product.name} intro video`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-video overflow-hidden", visualClassName)}>
      <span className="absolute right-5 top-5 z-10 rounded-full border-2 border-black bg-[#ffe25a] px-4 py-2 text-xs font-black shadow-[3px_3px_0_#0a0a0a]">
        Watch the routine
      </span>
      <Image
        src={product.heroImagePath}
        alt={`${product.name} intro image`}
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-contain p-8"
      />
    </div>
  );
}

function PreviewBuyBox({ product }: { product: Product }) {
  return (
    <div className="rounded-md border-2 border-black bg-white p-5 shadow-[4px_4px_0_#0a0a0a]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Option</p>
          <p className="font-semibold">{product.option.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">SKU {product.option.sku}</p>
        </div>
        <p className="text-xl font-bold">{formatUsd(product.option.priceCents)}</p>
      </div>
      <p className="mt-5 rounded-md bg-muted p-3 text-sm font-semibold text-muted-foreground">
        Admin preview only. Checkout is disabled on this screen.
      </p>
    </div>
  );
}

function TrustPanel({
  icon,
  title,
  body
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-md border-2 border-black bg-white p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe25a]">
        {icon}
      </span>
      <span>
        <span className="block font-black">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{body}</span>
      </span>
    </div>
  );
}
