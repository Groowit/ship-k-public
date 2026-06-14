/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { HomeFeatureBanner } from "./home-feature-banner";

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    priority,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => {
    void _fill;

    return (
      <img
        alt={alt ?? ""}
        data-priority={priority ? "true" : "false"}
        data-unoptimized={unoptimized ? "true" : "false"}
        {...props}
      />
    );
  }
}));

describe("HomeFeatureBanner", () => {
  it("prioritizes only the first background image when the first banner also has a side image", () => {
    render(
      <HomeFeatureBanner
        banners={[
          {
            id: "banner_1",
            topic: "TODAY",
            headline: "Skincare Starter Set",
            description: "A managed banner.",
            backgroundImagePath: "/background.png",
            sideImagePath: "/side.png",
            linkPath: "/shop",
            fontKey: "brand-display",
            textColor: "black",
            topicTextColor: "black",
            headlineTextColor: "black",
            descriptionTextColor: "black"
          }
        ]}
      />
    );

    expect(screen.getByAltText("")).toHaveAttribute("data-priority", "true");
    expect(screen.getByAltText("Skincare Starter Set banner image")).toHaveAttribute(
      "data-priority",
      "false"
    );
  });

  it("prioritizes the first side image when it is the only first banner image", () => {
    render(
      <HomeFeatureBanner
        banners={[
          {
            id: "banner_1",
            topic: "TODAY",
            headline: "Side image only",
            description: "Fallback banners use the side image as the main visual.",
            sideImagePath: "/side-only.png",
            linkPath: "/shop",
            fontKey: "brand-display",
            textColor: "black",
            topicTextColor: "black",
            headlineTextColor: "black",
            descriptionTextColor: "black"
          }
        ]}
      />
    );

    expect(screen.getByAltText("Side image only banner image")).toHaveAttribute(
      "data-priority",
      "true"
    );
  });

  it("preloads later banner images after the first render has settled", async () => {
    const requestedImages: string[] = [];
    const OriginalImage = window.Image;
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50
      });
      return 1;
    });
    const cancelIdleCallback = vi.fn();

    class PreloadImage {
      complete = false;
      naturalWidth = 0;
      naturalHeight = 0;
      crossOrigin = "";

      addEventListener() {}
      removeEventListener() {}

      set src(value: string) {
        requestedImages.push(value);
      }
    }

    Object.defineProperty(window, "Image", {
      configurable: true,
      value: PreloadImage
    });
    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      value: requestIdleCallback
    });
    Object.defineProperty(window, "cancelIdleCallback", {
      configurable: true,
      value: cancelIdleCallback
    });

    try {
      render(
        <HomeFeatureBanner
          banners={[
            {
              id: "banner_1",
              topic: "ONE",
              headline: "First banner",
              description: "First description",
              backgroundImagePath: "/first-background.png",
              sideImagePath: "/first-side.png",
              linkPath: "/shop",
              fontKey: "brand-display",
              textColor: "black",
              topicTextColor: "black",
              headlineTextColor: "black",
              descriptionTextColor: "black"
            },
            {
              id: "banner_2",
              topic: "TWO",
              headline: "Second banner",
              description: "Second description",
              backgroundImagePath: "/second-background.png",
              sideImagePath: "/second-side.png",
              linkPath: "/shop",
              fontKey: "brand-display",
              textColor: "black",
              topicTextColor: "black",
              headlineTextColor: "black",
              descriptionTextColor: "black"
            }
          ]}
        />
      );

      await waitFor(() => {
        expect(requestedImages).toEqual(
          expect.arrayContaining(["/second-background.png", "/second-side.png"])
        );
      });
      expect(requestedImages).not.toContain("/first-side.png");
    } finally {
      Object.defineProperty(window, "Image", {
        configurable: true,
        value: OriginalImage
      });
      Reflect.deleteProperty(window, "requestIdleCallback");
      Reflect.deleteProperty(window, "cancelIdleCallback");
    }
  });

  it("renders remote banner images without the Next.js optimizer", () => {
    render(
      <HomeFeatureBanner
        banners={[
          {
            id: "banner_1",
            topic: "TODAY",
            headline: "Skincare Starter Set",
            description: "A managed banner.",
            backgroundImagePath: "https://example.com/background.png",
            sideImagePath: "https://example.com/banner.png",
            linkPath: "/shop",
            fontKey: "brand-display",
            textColor: "black",
            topicTextColor: "black",
            headlineTextColor: "black",
            descriptionTextColor: "black"
          }
        ]}
      />
    );

    expect(screen.getByAltText("")).toHaveAttribute("data-unoptimized", "true");
    expect(screen.getByAltText("Skincare Starter Set banner image")).toHaveAttribute(
      "data-unoptimized",
      "true"
    );
  });

  it("renders a banner with only the background image", () => {
    render(
      <HomeFeatureBanner
        banners={[
          {
            id: "banner_1",
            topic: "TODAY",
            headline: "Background only",
            description: "No side image is required.",
            backgroundImagePath: "/banner-background.png",
            linkPath: "/shop",
            fontKey: "black-sans",
            textColor: "white",
            topicTextColor: "white",
            headlineTextColor: "white",
            descriptionTextColor: "black"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Background only" })).toBeVisible();
    expect(screen.queryByAltText("Background only banner image")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open banner: Background only" })).toHaveAttribute(
      "href",
      "/shop"
    );
    expect(screen.queryByText("Shop the focus")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next banner" })).not.toBeInTheDocument();
  });

  it("renders an image-only banner without copy placeholders", () => {
    const { container } = render(
      <HomeFeatureBanner
        banners={[
          {
            id: "banner_1",
            topic: "",
            headline: "",
            description: "",
            backgroundImagePath: "/image-only.png",
            linkPath: "/shop",
            fontKey: "black-sans",
            textColor: "black",
            topicTextColor: "black",
            headlineTextColor: "black",
            descriptionTextColor: "black"
          }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "Open banner" })).toHaveAttribute("href", "/shop");
    expect(container.querySelector("[data-home-banner-copy]")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("TOPIC")).not.toBeInTheDocument();
  });

  it("renders carousel controls only for multiple banners", () => {
    const { container } = render(
      <HomeFeatureBanner
        banners={[
          {
            id: "banner_1",
            topic: "ONE",
            headline: "First banner",
            description: "First description",
            backgroundImagePath: "/first.png",
            linkPath: "/shop",
            fontKey: "brand-display",
            textColor: "black",
            topicTextColor: "black",
            headlineTextColor: "black",
            descriptionTextColor: "black"
          },
          {
            id: "banner_2",
            topic: "TWO",
            headline: "Second banner",
            description: "Second description",
            backgroundImagePath: "/second.png",
            linkPath: "/shop",
            fontKey: "brand-display",
            textColor: "black",
            topicTextColor: "black",
            headlineTextColor: "black",
            descriptionTextColor: "black"
          }
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Next banner" })).toBeVisible();
    expect(screen.getByText("1/2")).toBeVisible();
    expect(container.querySelector("[data-home-banner-copy]")).toHaveAttribute(
      "data-banner-motion-direction",
      "next"
    );

    fireEvent.click(screen.getByRole("button", { name: "Next banner" }));

    expect(screen.getByText("2/2")).toBeVisible();
    expect(container.querySelector("[data-home-banner-copy]")).toHaveAttribute(
      "data-banner-motion-direction",
      "next"
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous banner" }));

    expect(screen.getByText("1/2")).toBeVisible();
    expect(container.querySelector("[data-home-banner-copy]")).toHaveAttribute(
      "data-banner-motion-direction",
      "previous"
    );
  });
});
