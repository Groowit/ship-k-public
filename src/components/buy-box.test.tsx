import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuyBox } from "./buy-box";
import { launchCatalogProducts } from "@/lib/products";

describe("BuyBox", () => {
  it("caps checkout quantity to the available stock", () => {
    render(
      <BuyBox
        product={{
          ...launchCatalogProducts[0],
          option: {
            ...launchCatalogProducts[0].option,
            stockQuantity: 2
          }
        }}
        isAuthenticated
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));

    expect(screen.getByText("2")).toBeVisible();
    expect(screen.getByRole("link", { name: "Buy now" })).toHaveAttribute(
      "href",
      "/checkout?product=skincare-starter-set&qty=2"
    );
  });

  it("blocks checkout when the product is out of stock", () => {
    render(
      <BuyBox
        product={{
          ...launchCatalogProducts[0],
          option: {
            ...launchCatalogProducts[0].option,
            stockQuantity: 0
          }
        }}
        isAuthenticated
      />
    );

    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Buy now" })).not.toBeInTheDocument();
  });
});
