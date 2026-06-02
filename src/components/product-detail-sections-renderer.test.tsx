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
});
