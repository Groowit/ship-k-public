import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./product-card";
import { launchCatalogProducts } from "@/lib/products";

describe("ProductCard", () => {
  it("renders a full-card set entry without a View button or wishlist control", () => {
    render(<ProductCard product={launchCatalogProducts[0]} />);

    expect(screen.getByRole("link", { name: /Skincare Starter Set/i })).toHaveAttribute(
      "href",
      "/products/skincare-starter-set"
    );
    expect(screen.getByText(/Skincare \/ shipK Curated/i)).toBeVisible();
    expect(screen.getByText("$49.00")).toBeVisible();
    expect(screen.getByText("STARTER")).toBeVisible();
    expect(screen.getByText(/5 items/i)).toBeVisible();
    expect(screen.getByText(/Beginner/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /^View$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /wish|heart|save/i })).not.toBeInTheDocument();
  });

  it("renders an automatically assigned merchandising badge when present", () => {
    render(<ProductCard product={{ ...launchCatalogProducts[0], badges: ["BESTSELLER"] }} />);

    expect(screen.getByText("BESTSELLER")).toBeVisible();
  });

  it("renders remote product images without the Next.js optimizer URL", () => {
    render(
      <ProductCard
        product={{
          ...launchCatalogProducts[0],
          heroImagePath: "https://example.com/product-image.png"
        }}
      />
    );

    const productImage = screen.getByAltText("Skincare Starter Set set");

    expect(productImage).toHaveAttribute(
      "src",
      "https://example.com/product-image.png"
    );
    expect(productImage).toHaveClass("object-cover");
    expect(productImage.parentElement).toHaveClass("bg-white");
    expect(productImage.parentElement).toHaveClass("aspect-square");
    expect(productImage.parentElement).toHaveClass("rounded-lg");
    expect(productImage.parentElement).toHaveClass("border-zinc-200");
    expect(productImage.parentElement?.className).not.toContain("bg-[#b4f0dc]");
    expect(productImage.parentElement?.className).not.toContain("border-black");
  });
});
