import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./site-header";
import { getCurrentAuthState } from "@/lib/auth";
import { isAdminProfile } from "@/lib/authz";
import { listBrandMembershipsForUser } from "@/lib/brand-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/"
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAuthState: vi.fn()
}));

vi.mock("@/lib/authz", () => ({
  isAdminProfile: vi.fn()
}));

vi.mock("@/lib/brand-store", () => ({
  listBrandMembershipsForUser: vi.fn()
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

  it("keeps the public affiliate entry point in the primary navigation", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({ user: null, profile: null });
    vi.mocked(isAdminProfile).mockReturnValue(false);

    render(await SiteHeader());

    expect(screen.getByRole("link", { name: "For Sellers" })).toHaveAttribute(
      "href",
      "/promoter"
    );
  });

  it("shows the brand portal link for signed-in brand members", async () => {
    vi.mocked(getCurrentAuthState).mockResolvedValue({
      user: { id: "brand_owner_1", email: "owner@example.com" } as never,
      profile: { id: "brand_owner_1", email: "owner@example.com", role: "customer" } as never
    });
    vi.mocked(listBrandMembershipsForUser).mockResolvedValue([
      {
        id: "membership_1",
        brandId: "brand_1",
        profileId: "brand_owner_1",
        memberRole: "owner",
        status: "active"
      }
    ]);
    vi.mocked(isAdminProfile).mockReturnValue(false);

    render(await SiteHeader());

    expect(screen.getByRole("link", { name: "Brand Portal" })).toHaveAttribute(
      "href",
      "/brand/products"
    );
  });
});
