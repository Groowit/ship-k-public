/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
