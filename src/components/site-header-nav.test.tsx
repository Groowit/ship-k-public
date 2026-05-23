import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeaderNav } from "./site-header-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

describe("SiteHeaderNav", () => {
  it("shows account and logout actions in the signed-in account menu", () => {
    render(<SiteHeaderNav navItems={[]} isSignedIn />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    expect(screen.getByRole("menuitem", { name: "My Page" })).toHaveAttribute(
      "href",
      "/account"
    );

    const logoutButton = screen.getByRole("menuitem", { name: "Logout" });
    const logoutForm = logoutButton.closest("form");

    expect(logoutButton).toHaveAttribute("type", "submit");
    expect(logoutForm).toHaveAttribute("method", "post");
    expect(logoutForm).toHaveAttribute("action", "/auth/sign-out");
  });
});
