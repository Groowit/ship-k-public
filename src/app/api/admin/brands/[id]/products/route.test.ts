import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { assignProductToBrand } from "@/lib/brand-store";
import { POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  assignProductToBrand: vi.fn()
}));

describe("admin brand product assignment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(assignProductToBrand).mockResolvedValue({
      id: "assignment_1",
      brandId: "brand_1",
      productId: "product_1",
      status: "active",
      canEditDetails: true
    } as never);
  });

  it("blocks non-admin product assignment", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AdminRequiredError());

    const response = await POST(jsonRequest({ productId: "product_1" }), {
      params: Promise.resolve({ id: "brand_1" })
    });

    expect(response.status).toBe(403);
    expect(assignProductToBrand).not.toHaveBeenCalled();
  });

  it("assigns existing products to brands for admins", async () => {
    const response = await POST(jsonRequest({ productId: "product_1" }), {
      params: Promise.resolve({ id: "brand_1" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assignment).toMatchObject({ id: "assignment_1" });
    expect(assignProductToBrand).toHaveBeenCalledWith({
      brandId: "brand_1",
      productId: "product_1",
      assignedBy: "admin_1"
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/brands/brand_1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
