import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./product-card";
import { demoProducts } from "@/lib/products";

describe("ProductCard", () => {
  it("renders a full-card curated set entry without a View button or wishlist control", () => {
    render(<ProductCard product={demoProducts[0]} />);

    expect(screen.getByRole("link", { name: /Daily K-Glow Set/i })).toHaveAttribute(
      "href",
      "/products/daily-k-glow-set"
    );
    expect(screen.getByText("Daily Glow")).toBeVisible();
    expect(screen.getByText("$49.00")).toBeVisible();
    expect(screen.getByText(/5 items/i)).toBeVisible();
    expect(screen.getByText(/Beginner/i)).toBeVisible();
    expect(screen.queryByRole("link", { name: /^View$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /wish|heart|save/i })).not.toBeInTheDocument();
  });
});
