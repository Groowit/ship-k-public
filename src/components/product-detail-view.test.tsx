/* eslint-disable @next/next/no-img-element */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { ProductDetailView } from "./product-detail-view";
import { launchCatalogProducts } from "@/lib/products";

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => {
    void _fill;
    void _priority;

    return (
      <img
        alt={alt ?? ""}
        data-unoptimized={unoptimized ? "true" : "false"}
        {...props}
      />
    );
  }
}));

describe("ProductDetailView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders remote product media without the Next.js optimizer", () => {
    const product = {
      ...launchCatalogProducts[0],
      heroImagePath: "https://example.com/hero.png",
      galleryImages: [
        {
          id: "gallery_1",
          imagePath: "https://example.com/gallery.png",
          altText: "Remote gallery"
        }
      ]
    };

    render(<ProductDetailView product={product} isAuthenticated />);

    expect(screen.getByAltText("Skincare Starter Set intro image")).toHaveAttribute(
      "data-unoptimized",
      "true"
    );
  });

  it("keeps product media neutral while preserving thumbnail selection", () => {
    render(<ProductDetailView product={launchCatalogProducts[0]} isAuthenticated />);

    const mainImage = screen.getByAltText("Skincare Starter Set intro image");
    expect(mainImage).toHaveClass("object-cover");
    expect(mainImage).not.toHaveClass("p-5");
    expect(mainImage.parentElement).toHaveClass("bg-white");
    expect(mainImage.parentElement).toHaveClass("aspect-square");
    expect(mainImage.parentElement?.className).not.toContain("bg-[#b4f0dc]");

    const selectedThumbnail = screen.getByRole("button", { name: "View media: Main image" });
    expect(selectedThumbnail).toHaveAttribute("aria-pressed", "true");
    expect(selectedThumbnail).toHaveClass("aspect-square");
    expect(selectedThumbnail).toHaveClass("border-[#ff3d7f]");
    expect(selectedThumbnail.className).not.toContain("bg-[#ffe25a]");
    expect(selectedThumbnail.className).not.toContain("hover:bg-[#fff8f0]");
    expect(selectedThumbnail.className).not.toContain("hover:-translate-y-0.5");
    expect(selectedThumbnail.querySelector("img")).toHaveClass("object-cover");

    const galleryThumbnail = screen.getByRole("button", { name: /View media: Skincare Starter Set set/i });
    expect(galleryThumbnail).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the functional lightbox overlay without restoring media fill colors", () => {
    render(<ProductDetailView product={launchCatalogProducts[0]} isAuthenticated />);

    fireEvent.click(screen.getByRole("button", { name: "View larger: Main image" }));

    const dialog = screen.getByRole("dialog", { name: "Main image" });
    expect(dialog).toHaveClass("bg-black/80");

    const enlargedImage = within(dialog).getByAltText("Skincare Starter Set intro image");
    expect(enlargedImage).toHaveClass("object-contain");
    expect(enlargedImage.parentElement).toHaveClass("bg-white");
    expect(enlargedImage.parentElement).toHaveClass("aspect-[3/2]");
    expect(enlargedImage.parentElement?.className).not.toContain("bg-[#b4f0dc]");
  });

  it("reveals a floating buy bar after the top buy box scrolls away", () => {
    let observerCallback: IntersectionObserverCallback | undefined;

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          observerCallback = callback;
        }

        observe = vi.fn();
        disconnect = vi.fn();
      }
    );

    render(<ProductDetailView product={launchCatalogProducts[0]} isAuthenticated />);

    const floatingBar = screen.getByTestId("floating-buy-bar");
    expect(floatingBar).toHaveClass("opacity-0");

    act(() => {
      observerCallback?.(
        [
          {
            isIntersecting: false,
            boundingClientRect: { bottom: -1 } as DOMRectReadOnly,
            rootBounds: { top: 0 } as DOMRectReadOnly
          } as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      );
    });

    expect(floatingBar).toHaveClass("opacity-100");
    expect(within(floatingBar).getByText("Skincare Starter Set")).toBeVisible();
    expect(within(floatingBar).getByText("$49.00")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));

    expect(within(floatingBar).getByText("$98.00 · Qty 2")).toBeVisible();
    expect(
      within(floatingBar).getByRole("link", { name: "Buy now: Skincare Starter Set" })
    ).toHaveAttribute("href", "/checkout?product=skincare-starter-set&qty=2");

    act(() => {
      observerCallback?.(
        [
          {
            isIntersecting: true,
            boundingClientRect: { bottom: 320 } as DOMRectReadOnly,
            rootBounds: { top: 0 } as DOMRectReadOnly
          } as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      );
    });

    expect(floatingBar).toHaveClass("opacity-0");
  });
});
