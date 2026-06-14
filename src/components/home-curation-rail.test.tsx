/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { HomeCurationRail } from "./home-curation-rail";
import type { Product } from "@/lib/products";

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
    return <img alt={alt ?? ""} data-unoptimized={unoptimized ? "true" : "false"} {...props} />;
  }
}));

describe("HomeCurationRail", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  });

  it("renders product links in order inside a horizontal snap rail without arrow controls", () => {
    render(
      <HomeCurationRail
        products={[
          productFixture({ id: "first", name: "First Pick", slug: "first-pick" }),
          productFixture({ id: "second", name: "Second Pick", slug: "second-pick" })
        ]}
      />
    );

    const rail = screen.getByTestId("home-curation-rail");
    const links = screen.getAllByRole("link");

    expect(rail.className).toContain("overflow-x-auto");
    expect(rail.className).toContain("snap-x");
    expect(links[0]).toHaveTextContent("First Pick");
    expect(links[1]).toHaveTextContent("Second Pick");
    expect(links[0]).toHaveAttribute("href", "/products/first-pick");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing for an empty product list", () => {
    const { container } = render(<HomeCurationRail products={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

function productFixture(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? "product_1";

  return {
    id,
    slug: overrides.slug ?? id,
    productType: overrides.productType ?? "single",
    brandName: overrides.brandName ?? "Glow Brand",
    name: overrides.name ?? "Glow Product",
    category: overrides.category ?? "Skincare",
    difficulty: overrides.difficulty ?? "Beginner",
    shortDescription: overrides.shortDescription ?? "Short copy",
    description: overrides.description ?? "Long copy",
    heroImagePath: overrides.heroImagePath ?? "/hero.png",
    badges: overrides.badges ?? [],
    tags: overrides.tags ?? ["GLOW"],
    status: overrides.status ?? "active",
    option: {
      id: `${id}_option`,
      name: "Default option",
      sku: `${id.toUpperCase()}-SKU`,
      priceCents: 4900,
      stockQuantity: 10,
      ...overrides.option
    },
    galleryImages: overrides.galleryImages ?? [],
    includedItems: overrides.includedItems ?? [],
    routineSteps: overrides.routineSteps ?? [],
    contentBlocks: overrides.contentBlocks ?? [],
    detailSections: overrides.detailSections ?? [],
    ...overrides
  };
}
