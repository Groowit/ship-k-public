import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";
import { getCurrentAuthState } from "@/lib/auth";
import { isAdminProfile } from "@/lib/authz";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAuthState: vi.fn()
}));

vi.mock("@/lib/authz", () => ({
  isAdminProfile: vi.fn()
}));

describe("SiteHeader", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes Home in the primary navigation", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({ user: null, profile: null });
    vi.mocked(isAdminProfile).mockReturnValue(false);

    render(await SiteHeader());

    const homeLink = screen.getByRole("link", { name: "Home" });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });
});
