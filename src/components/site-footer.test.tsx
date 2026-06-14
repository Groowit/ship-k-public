import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("does not expose the removed Makeup catalog link", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Skincare" })).toHaveAttribute(
      "href",
      "/shop"
    );
    expect(screen.queryByRole("link", { name: "Makeup" })).not.toBeInTheDocument();
  });
});
