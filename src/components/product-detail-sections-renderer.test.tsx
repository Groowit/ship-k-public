/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { ProductDetailSectionsRenderer } from "./product-detail-sections-renderer";
import { launchCatalogProducts } from "@/lib/products";

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => {
    void _fill;

    return (
      <img
        alt={alt ?? ""}
        data-unoptimized={unoptimized ? "true" : "false"}
        {...props}
      />
    );
  }
}));

describe("ProductDetailSectionsRenderer", () => {
  it("renders remote detail section images without the Next.js optimizer", () => {
    render(
      <ProductDetailSectionsRenderer
        product={{
          ...launchCatalogProducts[0],
          detailSections: [
            {
              id: "remote-section",
              sortOrder: 1,
              sectionType: "image",
              schemaVersion: 1,
              src: "https://example.com/detail.png",
              alt: "Remote detail image",
              aspectRatio: "square",
              imageFit: "cover",
              caption: undefined
            }
          ]
        }}
      />
    );

    expect(screen.getByAltText("Remote detail image")).toHaveAttribute(
      "data-unoptimized",
      "true"
    );
  });

  it("uses rounded matched frames and cover fit for photo groups", () => {
    render(
      <ProductDetailSectionsRenderer
        product={{
          ...launchCatalogProducts[0],
          detailSections: [
            {
              id: "gallery-section",
              sortOrder: 1,
              sectionType: "image_group",
              schemaVersion: 1,
              title: "Gallery",
              imageFit: "cover",
              images: [
                {
                  src: "/images/products/hydration-skincare-set.png",
                  alt: "First gallery image",
                  caption: undefined
                },
                {
                  src: "/images/products/glow-ampoule-kit.png",
                  alt: "Second gallery image",
                  caption: undefined
                }
              ]
            }
          ]
        }}
      />
    );

    const firstImage = screen.getByAltText("First gallery image");
    const secondImage = screen.getByAltText("Second gallery image");

    expect(firstImage).toHaveClass("object-cover");
    expect(secondImage).toHaveClass("object-cover");
    expect(firstImage.parentElement).toHaveClass("aspect-[4/3]", "overflow-hidden", "rounded-lg");
  });

  it("can preserve the full photo with contain fit inside rounded frames", () => {
    render(
      <ProductDetailSectionsRenderer
        product={{
          ...launchCatalogProducts[0],
          detailSections: [
            {
              id: "image-text-section",
              sortOrder: 1,
              sectionType: "image_text",
              schemaVersion: 1,
              src: "/images/products/hydration-skincare-set.png",
              alt: "Contained product image",
              eyebrow: undefined,
              title: "Full image",
              body: "The image should stay fully visible.",
              imagePosition: "left",
              imageFit: "contain"
            }
          ]
        }}
      />
    );

    const image = screen.getByAltText("Contained product image");

    expect(image).toHaveClass("object-contain", "p-6");
    expect(image.parentElement).toHaveClass("aspect-square", "overflow-hidden", "rounded-lg");
  });

  it("centers default long detail images with layout margins instead of transforms", () => {
    render(
      <ProductDetailSectionsRenderer
        product={{
          ...launchCatalogProducts[0],
          detailSections: [
            {
              id: "long-detail-section",
              sortOrder: 1,
              sectionType: "long_detail_image",
              schemaVersion: 1,
              src: "/catalog-assets/detail/glass-skin-lifestyle.png",
              alt: "Long detail image",
              caption: undefined,
              maxWidth: "default"
            }
          ]
        }}
      />
    );

    const image = screen.getByAltText("Long detail image");

    expect(image).toHaveAttribute("sizes", "100vw");
    expect(image.parentElement).toHaveClass(
      "w-[calc(100vw-2rem)]",
      "max-w-none"
    );
    expect(image.parentElement).toHaveStyle(
      "margin-inline: calc((100% - 100vw + 2rem) / 2)"
    );
    expect(image.parentElement).not.toHaveClass("relative", "left-1/2", "-translate-x-1/2");
  });
});
