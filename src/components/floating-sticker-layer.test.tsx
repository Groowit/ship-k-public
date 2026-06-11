/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { FloatingStickerLayer } from "./floating-sticker-layer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/products/hydration-skincare-set"
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    height: _height,
    priority: _priority,
    unoptimized: _unoptimized,
    width: _width,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    unoptimized?: boolean;
  }) => {
    void _height;
    void _priority;
    void _unoptimized;
    void _width;

    return <img alt={alt ?? ""} {...props} />;
  }
}));

describe("FloatingStickerLayer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves the lower product detail sticker to the right page margin", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    render(<FloatingStickerLayer />);

    const stickerStyles = screen
      .getAllByTestId("floating-sticker")
      .map((sticker) => sticker.getAttribute("style") ?? "");
    const leftStickerRects = stickerStyles
      .filter((style) => style.includes("left: max"))
      .map((style) => ({
        top: readPixelStyle(style, "top"),
        width: readPixelStyle(style, "width")
      }));
    const rightStickerRects = stickerStyles
      .filter((style) => style.includes("right: max"))
      .map((style) => ({
        top: readPixelStyle(style, "top"),
        width: readPixelStyle(style, "width")
      }))
      .sort((a, b) => a.top - b.top);

    expect(leftStickerRects).toHaveLength(1);
    expect(rightStickerRects).toHaveLength(3);
    expect(rightStickerRects[1].top).toBe(780);
    expect(rightStickerRects[1].top - (rightStickerRects[0].top + rightStickerRects[0].width))
      .toBeGreaterThanOrEqual(88);
    expect(rightStickerRects[2].top - (rightStickerRects[1].top + rightStickerRects[1].width))
      .toBeGreaterThanOrEqual(88);
  });
});

function readPixelStyle(style: string, property: string) {
  const match = new RegExp(`${property}:\\s*([\\d.]+)px`).exec(style);

  if (!match) {
    throw new Error(`Missing ${property} in style: ${style}`);
  }

  return Number(match[1]);
}
