import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireCurrentAdmin } from "@/lib/auth";
import { assignProductToBrand, updateProductBrandAssignment } from "@/lib/brand-store";
import { PATCH, POST } from "./route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/brand-store", () => ({
  BrandInputError: class BrandInputError extends Error {
    status = 400;
  },
  assignProductToBrand: vi.fn(),
  updateProductBrandAssignment: vi.fn()
}));

describe("admin brand products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(assignProductToBrand).mockResolvedValue({ id: "assignment_1" } as never);
    vi.mocked(updateProductBrandAssignment).mockResolvedValue({ id: "assignment_1" } as never);
  });

  it("assigns a product to a brand as the current admin", async () => {
    const response = await POST(jsonRequest({ productId: "product_1" }), {
      params: Promise.resolve({ id: "brand_1" })
    });

    expect(response.status).toBe(200);
    expect(assignProductToBrand).toHaveBeenCalledWith({
      brandId: "brand_1",
      productId: "product_1",
      assignedBy: "admin_1"
    });
  });

  it("updates product assignment status and edit scope", async () => {
    const response = await PATCH(
      jsonRequest({ assignmentId: "assignment_1", status: "paused", canEditDetails: false }),
      {
        params: Promise.resolve({ id: "brand_1" })
      }
    );

    expect(response.status).toBe(200);
    expect(updateProductBrandAssignment).toHaveBeenCalledWith({
      brandId: "brand_1",
      assignmentId: "assignment_1",
      status: "paused",
      canEditDetails: false
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
