import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminHomeCurationPage from "./page";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listProducts } from "@/lib/commerce-store";
import {
  HomeCurationSetupRequiredError,
  listAdminHomeCurationEntries
} from "@/lib/home-curation";

vi.mock("@/lib/admin-page-auth", () => ({
  requireAdminPageAccess: vi.fn()
}));

vi.mock("@/lib/commerce-store", () => ({
  listProducts: vi.fn()
}));

vi.mock("@/lib/home-curation", () => {
  class HomeCurationSetupRequiredError extends Error {
    status = 503;

    constructor() {
      super("Home curation table is not ready. Apply Supabase migrations before managing curation.");
    }
  }

  return {
    HomeCurationSetupRequiredError,
    listAdminHomeCurationEntries: vi.fn()
  };
});

vi.mock("@/components/admin-home-curation-client", () => ({
  AdminHomeCurationClient: ({
    initialEntries,
    products
  }: {
    initialEntries: Array<{ id: string }>;
    products: Array<{ id: string }>;
  }) => (
    <div data-testid="admin-home-curation-client">
      {initialEntries.length}:{products.length}
    </div>
  )
}));

describe("AdminHomeCurationPage", () => {
  it("does not load curation data when admin access is denied", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(false);

    await expect(AdminHomeCurationPage()).resolves.toBeNull();
    expect(listAdminHomeCurationEntries).not.toHaveBeenCalled();
    expect(listProducts).not.toHaveBeenCalled();
  });

  it("loads curation entries and products for the management client", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listAdminHomeCurationEntries).mockResolvedValue([{ id: "entry_1" }] as never);
    vi.mocked(listProducts).mockResolvedValue([{ id: "product_1" }, { id: "product_2" }] as never);

    render(await AdminHomeCurationPage());

    expect(screen.getByText("홈 큐레이션 상품 선반")).toBeVisible();
    expect(screen.getByTestId("admin-home-curation-client")).toHaveTextContent("1:2");
  });

  it("renders a setup notice instead of crashing when the curation table is missing", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listAdminHomeCurationEntries).mockRejectedValue(new HomeCurationSetupRequiredError());
    vi.mocked(listProducts).mockResolvedValue([] as never);

    render(await AdminHomeCurationPage());

    expect(screen.getByText("홈 큐레이션 테이블이 아직 준비되지 않았습니다")).toBeVisible();
    expect(screen.queryByTestId("admin-home-curation-client")).not.toBeInTheDocument();
  });
});
