import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { archiveProduct, createProduct, updateProduct } from "@/lib/commerce-store";
import { POST } from "./route";
import { DELETE, PATCH } from "./[id]/route";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireCurrentAdmin: vi.fn()
  };
});

vi.mock("@/lib/commerce-store", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  archiveProduct: vi.fn()
}));

const productResponse = {
  id: "product_1",
  name: "Rice Glow Kit",
  status: "draft"
};

const validPayload = {
  productType: "set",
  brandName: "shipK Curated",
  name: "Rice Glow Kit",
  category: "Skincare",
  tags: ["rice", "glow"],
  difficulty: "Beginner",
  itemCount: 2,
  shortDescription: "A calm daily glow routine.",
  description: "A structured test routine for admin API coverage.",
  bestFor: "Morning prep",
  result: "Fresh finish",
  optionName: "2-item set",
  sku: "rice-glow",
  priceUsd: 49,
  stockQuantity: 8,
  heroImagePath: "/catalog-assets/admin-product-placeholder.svg",
  introVideoUrl: "https://www.youtube.com/watch?v=abc123",
  galleryImages: [
    {
      imagePath: "/catalog-assets/admin-product-placeholder.svg",
      altText: "Rice Glow Kit gallery image"
    }
  ],
  includedItems: [
    {
      name: "Rice Cleanser",
      category: "Cleanser",
      description: "Cleanse lightly."
    }
  ],
  routineSteps: [
    {
      title: "Cleanse",
      body: "Use a small amount."
    }
  ],
  contentBlocks: [
    {
      type: "text",
      title: "Why it works",
      body: "Balanced routine copy."
    }
  ],
  detailSections: [
    {
      sectionType: "heading",
      schemaVersion: 1,
      text: "Detail story",
      level: "h2",
      align: "left"
    },
    {
      sectionType: "text",
      schemaVersion: 1,
      body: "Customer-facing detail document copy.",
      align: "left"
    }
  ],
  status: "draft"
};

describe("admin product API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentAdmin).mockResolvedValue({
      user: { id: "admin_1" } as never,
      profile: null
    });
    vi.mocked(createProduct).mockResolvedValue(productResponse as never);
    vi.mocked(updateProduct).mockResolvedValue({ ...productResponse, status: "active" } as never);
    vi.mocked(archiveProduct).mockResolvedValue(undefined);
  });

  it("blocks unauthenticated product creation before touching storage", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AuthRequiredError());

    const response = await POST(jsonRequest(validPayload));

    expect(response.status).toBe(401);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("creates a draft with normalized video, cents, gallery, and structured detail rows", async () => {
    const response = await POST(jsonRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product).toEqual(productResponse);
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        priceCents: 4900,
        tags: ["RICE", "GLOW"],
        sku: "RICE-GLOW",
        introVideoUrl: "https://www.youtube.com/embed/abc123",
        galleryImages: validPayload.galleryImages,
        includedItems: validPayload.includedItems,
        routineSteps: validPayload.routineSteps,
        detailSections: validPayload.detailSections,
        detailActorId: "admin_1",
        status: "draft"
      })
    );
  });

  it("publishes an active product update through PATCH", async () => {
    const response = await PATCH(
      jsonRequest({ ...validPayload, status: "active" }),
      { params: Promise.resolve({ id: "product_1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateProduct).toHaveBeenCalledWith(
      "product_1",
      expect.objectContaining({
        priceCents: 4900,
        detailActorId: "admin_1",
        status: "active"
      })
    );
  });

  it("archives products with DELETE instead of hard deleting through the API", async () => {
    const response = await DELETE(new Request("http://test.local/api/admin/products/product_1"), {
      params: Promise.resolve({ id: "product_1" })
    });

    expect(response.status).toBe(200);
    expect(archiveProduct).toHaveBeenCalledWith("product_1");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
