import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminBannersPage from "./page";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { HomeBannerSetupRequiredError, listAdminHomeBanners } from "@/lib/home-banners";

vi.mock("@/lib/admin-page-auth", () => ({
  requireAdminPageAccess: vi.fn()
}));

vi.mock("@/lib/home-banners", async () => {
  const actual = await vi.importActual<typeof import("@/lib/home-banners")>("@/lib/home-banners");
  return {
    ...actual,
    listAdminHomeBanners: vi.fn()
  };
});

vi.mock("@/components/admin-banners-client", () => ({
  AdminBannersClient: ({ initialBanners }: { initialBanners: Array<{ id: string }> }) => (
    <div data-testid="admin-banners-client">{initialBanners.length}</div>
  )
}));

describe("AdminBannersPage", () => {
  it("does not load banners when admin access is denied", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(false);

    await expect(AdminBannersPage()).resolves.toBeNull();
    expect(listAdminHomeBanners).not.toHaveBeenCalled();
  });

  it("loads admin banners for the management client", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listAdminHomeBanners).mockResolvedValue([{ id: "banner_1" }] as never);

    render(await AdminBannersPage());

    expect(screen.getByText("홈 배너 관리")).toBeVisible();
    expect(screen.getByTestId("admin-banners-client")).toHaveTextContent("1");
  });

  it("renders a setup notice instead of crashing when the banner table is missing", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listAdminHomeBanners).mockRejectedValue(new HomeBannerSetupRequiredError());

    render(await AdminBannersPage());

    expect(screen.getByText("배너 테이블이 아직 준비되지 않았습니다")).toBeVisible();
    expect(screen.queryByTestId("admin-banners-client")).not.toBeInTheDocument();
  });
});
