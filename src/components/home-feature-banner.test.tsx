/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { HomeFeatureBanner } from "./home-feature-banner";
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

describe("HomeFeatureBanner", () => {
  it("renders remote product hero images without the Next.js optimizer", () => {
    render(
      <HomeFeatureBanner
        products={[
          {
            ...launchCatalogProducts[0],
            heroImagePath: "https://example.com/banner.png"
          }
        ]}
      />
    );

    expect(screen.getByAltText("Skincare Starter Set banner image")).toHaveAttribute(
      "data-unoptimized",
      "true"
    );
  });
});
