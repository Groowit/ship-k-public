import { describe, expect, it, vi } from "vitest";
import AdminCommissionsPage from "./page";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listAdminCommissionSettlements } from "@/lib/commerce-store";

vi.mock("@/lib/admin-page-auth", () => ({
  requireAdminPageAccess: vi.fn()
}));

vi.mock("@/lib/commerce-store", () => ({
  listAdminCommissionSettlements: vi.fn()
}));

vi.mock("@/components/admin-commissions-client", () => ({
  AdminCommissionsClient: ({ settlements }: { settlements: unknown[] }) => (
    <div data-testid="admin-commission-settlements">{settlements.length}</div>
  )
}));

describe("AdminCommissionsPage", () => {
  it("does not load settlement data when admin access is denied", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(false);

    await expect(AdminCommissionsPage()).resolves.toBeNull();
    expect(listAdminCommissionSettlements).not.toHaveBeenCalled();
  });

  it("loads promoter-level commission settlements after admin access is confirmed", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listAdminCommissionSettlements).mockResolvedValue([
      { affiliateId: "affiliate_1" }
    ] as Awaited<ReturnType<typeof listAdminCommissionSettlements>>);

    const page = await AdminCommissionsPage();

    expect(page).not.toBeNull();
    expect(listAdminCommissionSettlements).toHaveBeenCalledOnce();
  });
});
