import { describe, expect, it, vi } from "vitest";
import AdminOrdersPage from "./page";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listOrders } from "@/lib/commerce-store";

vi.mock("@/lib/admin-page-auth", () => ({
  requireAdminPageAccess: vi.fn()
}));

vi.mock("@/lib/commerce-store", () => ({
  listOrders: vi.fn()
}));

vi.mock("@/components/admin-orders-client", () => ({
  AdminOrdersClient: ({ orders }: { orders: unknown[] }) => (
    <div data-testid="admin-orders">{orders.length}</div>
  )
}));

describe("AdminOrdersPage", () => {
  it("does not load orders when admin access is denied", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(false);

    await expect(AdminOrdersPage()).resolves.toBeNull();
    expect(listOrders).not.toHaveBeenCalled();
  });

  it("loads orders after admin access is confirmed", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listOrders).mockResolvedValue([
      { id: "order_1" }
    ] as Awaited<ReturnType<typeof listOrders>>);

    const page = await AdminOrdersPage();

    expect(page).not.toBeNull();
    expect(listOrders).toHaveBeenCalledOnce();
  });
});
