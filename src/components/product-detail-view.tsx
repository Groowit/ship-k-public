"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronDown, Maximize2, PlayCircle, X } from "lucide-react";
import { BuyBox } from "@/components/buy-box";
import { ProductDetailSectionsRenderer } from "@/components/product-detail-sections-renderer";
import { ProductReviewsSection } from "@/components/product-reviews-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { buildAuthRedirectPath } from "@/lib/authz";
import { formatUsd } from "@/lib/commerce";
import { getImageOptimizationProps } from "@/lib/image-path";
import {
  hasCompleteProductDisclosureNotes,
  productDisclosureSections,
  type ProductDisclosureNotes,
  type ProductDisclosureSectionId
} from "@/lib/product-disclosure-notes";
import { getProductImageFrameAspectClass } from "@/lib/product-image-frame";
import { Product, isProductPurchasable } from "@/lib/products";
import type { ProductReviewEligibility, ProductReviewsPayload } from "@/lib/reviews-store";
import { cn } from "@/lib/utils";

export function ProductDetailView({
  product,
  isAuthenticated,
  viewerId,
  reviewsPayload,
  reviewEligibility,
  previewMode = false
}: {
  product: Product;
  isAuthenticated: boolean;
  viewerId?: string;
  reviewsPayload?: ProductReviewsPayload;
  reviewEligibility?: ProductReviewEligibility;
  previewMode?: boolean;
}) {
  const itemCountLabel = product.itemCount ? `${product.itemCount} items` : undefined;
  const visibleTags = product.tags.filter((tag) => tag.toLowerCase() !== itemCountLabel?.toLowerCase());
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [showFloatingBuyBar, setShowFloatingBuyBar] = useState(false);

  useEffect(() => {
    if (previewMode) {
      return;
    }

    const buyBox = buyBoxRef.current;

    if (!buyBox) {
      return;
    }

    const updateFromCurrentPosition = () => {
      setShowFloatingBuyBar(buyBox.getBoundingClientRect().bottom < 0);
    };

    if (typeof IntersectionObserver === "undefined") {
      updateFromCurrentPosition();
      window.addEventListener("scroll", updateFromCurrentPosition, { passive: true });
      window.addEventListener("resize", updateFromCurrentPosition);

      return () => {
        window.removeEventListener("scroll", updateFromCurrentPosition);
        window.removeEventListener("resize", updateFromCurrentPosition);
      };
    }

    const observer = new IntersectionObserver(([entry]) => {
      const viewportTop = entry.rootBounds?.top ?? 0;
      const hasScrolledPastBuyBox =
        !entry.isIntersecting && entry.boundingClientRect.bottom <= viewportTop;

      setShowFloatingBuyBar(hasScrolledPastBuyBox);
    });

    observer.observe(buyBox);
    updateFromCurrentPosition();

    return () => {
      observer.disconnect();
    };
  }, [previewMode]);

  return (
    <article className={cn("overflow-x-clip", !previewMode && "pb-24 sm:pb-28")}>
      <section className="container grid items-start gap-9 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <ProductMediaViewer product={product} />
        <div className="grid content-start gap-6">
          <div>
            <div className="flex flex-wrap gap-2">
              {product.badges.map((badge) => (
                <Badge key={badge} className="rounded-md border-0 bg-[#793de1] text-[#fff75f]">
                  {badge}
                </Badge>
              ))}
              {visibleTags.map((tag) => (
                <Badge key={tag} className="rounded-full border border-[#d8bf38] bg-[#ffe25a] text-foreground">
                  {tag}
                </Badge>
              ))}
              {itemCountLabel ? <Badge>{itemCountLabel}</Badge> : null}
              {product.difficulty ? <Badge className="bg-[#bde0fe]">{product.difficulty}</Badge> : null}
              {product.option.stockQuantity === 0 ? <Badge>Out of stock</Badge> : null}
            </div>
            <p className="mt-6 text-sm font-black text-muted-foreground">
              Shop / {product.category}
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
            <p className="mt-6 font-brand-heavy text-3xl text-foreground">
              {formatUsd(product.option.priceCents)}
            </p>
          </div>
          <div ref={buyBoxRef}>
            {previewMode ? (
              <PreviewBuyBox product={product} />
            ) : (
              <BuyBox
                product={product}
                isAuthenticated={isAuthenticated}
                quantity={quantity}
                onQuantityChange={setQuantity}
              />
            )}
          </div>
          <ProductDisclosureNotesAccordion notes={product.disclosureNotes} />
        </div>
      </section>

      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        initialPayload={reviewsPayload}
        eligibility={reviewEligibility}
        isAuthenticated={isAuthenticated}
        viewerId={viewerId}
        detailContent={<ProductDetailSectionsRenderer product={product} />}
      />
      {!previewMode ? (
        <FloatingBuyBar
          product={product}
          isAuthenticated={isAuthenticated}
          quantity={quantity}
          visible={showFloatingBuyBar}
        />
      ) : null}
    </article>
  );
}

function ProductDisclosureNotesAccordion({ notes }: { notes?: ProductDisclosureNotes }) {
  const [openSectionIds, setOpenSectionIds] = useState<Set<ProductDisclosureSectionId>>(
    () => new Set(["curatorsNote"])
  );

  if (!hasCompleteProductDisclosureNotes(notes)) {
    return null;
  }

  function toggleSection(sectionId: ProductDisclosureSectionId) {
    setOpenSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  return (
    <section
      aria-label="Product disclosure notes"
      className="overflow-hidden rounded-md border border-zinc-200 bg-white"
    >
      {productDisclosureSections.map((section, index) => {
        const isOpen = openSectionIds.has(section.id);
        const panelId = `product-disclosure-${section.id}`;

        return (
          <div key={section.id} className={cn(index > 0 && "border-t border-zinc-200")}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-lg font-black text-foreground">{section.label}</span>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {isOpen ? (
              <div id={panelId} className="grid gap-4 px-5 pb-5">
                {section.fields.map((field) => (
                  <div key={field.id} className="grid gap-1">
                    <h3 className="text-xs font-black uppercase tracking-normal text-[#ff3d7f]">
                      {field.label}
                    </h3>
                    <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                      {(notes[section.id] as Record<string, string>)[field.id]}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

type ProductMediaItem =
  | {
      id: string;
      type: "image";
      src: string;
      alt: string;
      label: string;
      priority?: boolean;
    }
  | {
      id: string;
      type: "video";
      src: string;
      label: string;
    };

const PRODUCT_MEDIA_AUTO_ROTATE_MS = 3000;
const PRODUCT_MEDIA_TRANSITION_MS = 700;

function ProductMediaViewer({ product }: { product: Product }) {
  const mediaItems = useMemo(() => buildProductMediaItems(product), [product]);
  const imageMediaItems = useMemo(() => mediaItems.filter((item) => item.type === "image"), [mediaItems]);
  const [selectedId, setSelectedId] = useState(mediaItems[0]?.id ?? "");
  const [expandedMedia, setExpandedMedia] = useState<ProductMediaItem | null>(null);
  const [isAutoRotationPaused, setIsAutoRotationPaused] = useState(false);
  const thumbnailRailRef = useRef<HTMLDivElement>(null);
  const selectedThumbnailRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const selectedMedia = mediaItems.find((item) => item.id === selectedId) ?? mediaItems[0];

  useEffect(() => {
    if (!mediaItems.some((item) => item.id === selectedId)) {
      setSelectedId(mediaItems[0]?.id ?? "");
    }
  }, [mediaItems, selectedId]);

  useEffect(() => {
    if (
      !selectedMedia ||
      selectedMedia.type !== "image" ||
      imageMediaItems.length < 2 ||
      expandedMedia ||
      isAutoRotationPaused ||
      prefersReducedMotion ||
      (typeof document !== "undefined" && document.hidden)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedId((currentId) => {
        const currentIndex = imageMediaItems.findIndex((item) => item.id === currentId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % imageMediaItems.length;

        return imageMediaItems[nextIndex]?.id ?? currentId;
      });
    }, PRODUCT_MEDIA_AUTO_ROTATE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    expandedMedia,
    imageMediaItems,
    isAutoRotationPaused,
    prefersReducedMotion,
    selectedMedia
  ]);

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    const selectedThumbnail = selectedThumbnailRef.current;

    if (!rail || !selectedThumbnail || rail.scrollHeight <= rail.clientHeight) {
      return;
    }

    const railRect = rail.getBoundingClientRect();
    const thumbnailRect = selectedThumbnail.getBoundingClientRect();
    const isClipped =
      thumbnailRect.top < railRect.top ||
      thumbnailRect.bottom > railRect.bottom;

    if (isClipped) {
      selectedThumbnail.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [selectedId]);

  if (!selectedMedia) {
    return null;
  }

  const hasMultipleMedia = mediaItems.length > 1;

  return (
    <div
      data-testid="product-media-viewer"
      className="relative z-10 grid content-start gap-4 lg:sticky lg:top-24 lg:self-start"
      onPointerEnter={() => setIsAutoRotationPaused(true)}
      onPointerLeave={() => setIsAutoRotationPaused(false)}
      onFocusCapture={() => setIsAutoRotationPaused(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;

        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setIsAutoRotationPaused(false);
        }
      }}
    >
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="relative">
          <MediaStage item={selectedMedia} productName={product.name} />
          <button
            type="button"
            aria-label={`View larger: ${selectedMedia.label}`}
            onClick={() => setExpandedMedia(selectedMedia)}
            className="absolute inset-0 z-10 flex cursor-zoom-in items-start justify-end p-4 text-left"
          >
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 text-xs font-black">
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              View larger
            </span>
          </button>
        </div>
      </div>
      {hasMultipleMedia ? (
        <div
          ref={thumbnailRailRef}
          data-testid="product-media-thumbnails"
          className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:absolute lg:right-full lg:top-0 lg:mr-4 lg:max-h-[calc(100vh-8rem)] lg:w-24 lg:grid-cols-1 lg:overflow-y-auto lg:py-2 lg:pl-2 lg:pr-3"
        >
          {mediaItems.map((item) => {
            const isSelected = item.id === selectedMedia.id;

            return (
              <button
                key={item.id}
                ref={isSelected ? selectedThumbnailRef : undefined}
                type="button"
                aria-label={`View media: ${item.label}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border border-zinc-300 bg-white transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff3d7f]/30",
                  isSelected && "border-[#ff3d7f]"
                )}
              >
                <MediaThumbnail item={item} />
              </button>
            );
          })}
        </div>
      ) : null}
      {expandedMedia ? (
        <MediaLightbox
          item={expandedMedia}
          productName={product.name}
          onClose={() => setExpandedMedia(null)}
        />
      ) : null}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function buildProductMediaItems(product: Product): ProductMediaItem[] {
  const items: ProductMediaItem[] = [];

  if (product.introVideoUrl) {
    items.push({
      id: "intro-video",
      type: "video",
      src: normalizeEmbeddableVideoUrl(product.introVideoUrl),
      label: "Intro video"
    });
  }

  items.push({
    id: "hero-image",
    type: "image",
    src: product.heroImagePath,
    alt: `${product.name} intro image`,
    label: "Main image",
    priority: true
  });

  product.galleryImages.slice(0, 10).forEach((image, index) => {
    items.push({
      id: `gallery-${image.id}`,
      type: "image",
      src: image.imagePath,
      alt: image.altText || `${product.name} gallery image ${index + 1}`,
      label: image.altText || `Gallery image ${index + 1}`
    });
  });

  return items;
}

function MediaFrame({
  item,
  productName,
  modal = false,
  onImageLoad
}: {
  item: ProductMediaItem;
  productName: string;
  modal?: boolean;
  onImageLoad?: () => void;
}) {
  if (item.type === "video") {
    return (
      <div className="overflow-hidden bg-foreground">
        <div className="aspect-video">
          <iframe
            src={item.src}
            title={`${productName} intro video`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white",
        modal ? getProductImageFrameAspectClass(item.src) : "aspect-square"
      )}
    >
      <Image
        src={item.src}
        alt={item.alt}
        fill
        priority={item.priority && !modal}
        onLoad={onImageLoad}
        {...getImageOptimizationProps(item.src)}
        sizes={modal ? "90vw" : "(min-width: 1024px) 50vw, 100vw"}
        className={modal ? "object-contain" : "object-cover"}
      />
    </div>
  );
}

function MediaStage({ item, productName }: { item: ProductMediaItem; productName: string }) {
  const [visibleItem, setVisibleItem] = useState(item);
  const [incomingItem, setIncomingItem] = useState<ProductMediaItem | null>(null);
  const [isIncomingReady, setIsIncomingReady] = useState(false);

  useEffect(() => {
    if (visibleItem.id === item.id) {
      setIncomingItem(null);
      setIsIncomingReady(false);
      return;
    }

    if (visibleItem.type !== "image" || item.type !== "image") {
      setVisibleItem(item);
      setIncomingItem(null);
      setIsIncomingReady(false);
      return;
    }

    setIncomingItem(item);
    setIsIncomingReady(false);
  }, [item, visibleItem]);

  useEffect(() => {
    if (!incomingItem || !isIncomingReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleItem(incomingItem);
      setIncomingItem(null);
      setIsIncomingReady(false);
    }, PRODUCT_MEDIA_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [incomingItem, isIncomingReady]);

  return (
    <div className="relative overflow-hidden bg-white">
      <div
        key={`visible-${visibleItem.id}`}
        className={cn("relative z-[1]", incomingItem && isIncomingReady && "shipk-product-media-exit")}
      >
        <MediaFrame item={visibleItem} productName={productName} />
      </div>
      {incomingItem ? (
        <div
          key={`incoming-${incomingItem.id}`}
          className={cn(
            "pointer-events-none absolute inset-0 z-[2]",
            isIncomingReady ? "shipk-product-media-enter" : "opacity-0"
          )}
        >
          <MediaFrame
            item={incomingItem}
            productName={productName}
            onImageLoad={() => setIsIncomingReady(true)}
          />
        </div>
      ) : null}
    </div>
  );
}

function MediaThumbnail({ item }: { item: ProductMediaItem }) {
  if (item.type === "video") {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-foreground text-white">
        <PlayCircle className="h-8 w-8" aria-hidden="true" />
        <span className="text-xs font-black">Video</span>
      </span>
    );
  }

  return (
    <Image
      src={item.src}
      alt=""
      fill
      {...getImageOptimizationProps(item.src)}
      sizes="(min-width: 1024px) 12vw, 25vw"
      className="object-cover"
    />
  );
}

function MediaLightbox({
  item,
  productName,
  onClose
}: {
  item: ProductMediaItem;
  productName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.label}
      className="fixed inset-0 z-[100] bg-black/80 p-4 md:p-8"
    >
      <button
        type="button"
        aria-label="Close media"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 md:right-8 md:top-8"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-6xl overflow-hidden rounded-lg border border-white/70 bg-white">
          <MediaFrame item={item} productName={productName} modal />
        </div>
      </div>
    </div>,
    document.body
  );
}

function normalizeEmbeddableVideoUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }

    if (url.hostname.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) {
        return `https://www.youtube.com/embed/${watchId}`;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : value;
      }
    }

    if (url.hostname === "vimeo.com") {
      const id = url.pathname.replace("/", "");
      return id ? `https://player.vimeo.com/video/${id}` : value;
    }
  } catch {
    return value;
  }

  return value;
}

function PreviewBuyBox({ product }: { product: Product }) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-5">
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

function FloatingBuyBar({
  product,
  isAuthenticated,
  quantity,
  visible
}: {
  product: Product;
  isAuthenticated: boolean;
  quantity: number;
  visible: boolean;
}) {
  const canCheckout = isProductPurchasable(product);
  const checkoutQuantity = canCheckout ? quantity : 1;
  const checkoutPath = `/checkout?product=${product.slug}&qty=${checkoutQuantity}`;
  const checkoutHref = isAuthenticated
    ? checkoutPath
    : buildAuthRedirectPath(checkoutPath);
  const actionLabel = isAuthenticated ? "Buy now" : "Sign in to buy";
  const priceLabel =
    checkoutQuantity > 1
      ? `${formatUsd(product.option.priceCents * checkoutQuantity)} · Qty ${checkoutQuantity}`
      : formatUsd(product.option.priceCents);

  return (
    <div
      data-testid="floating-buy-bar"
      aria-hidden={!visible}
      className={cn(
        "shipk-floating-buy-bar fixed inset-x-0 bottom-0 z-40 px-3 sm:px-4",
        "transition duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <div className="container">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg border border-zinc-300 bg-white/95 p-2.5 backdrop-blur sm:p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-5 text-foreground sm:text-base">
              {product.name}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">{priceLabel}</p>
          </div>
          {canCheckout ? (
            <Link
              href={checkoutHref}
              tabIndex={visible ? undefined : -1}
              aria-label={`${actionLabel}: ${product.name}`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "shipk-commerce-primary h-11 shrink-0 px-5"
              )}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className={cn(
                buttonVariants({ size: "lg" }),
                "shipk-commerce-primary h-11 shrink-0 px-5"
              )}
            >
              Out of stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
