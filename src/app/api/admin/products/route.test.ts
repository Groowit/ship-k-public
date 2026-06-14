import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, requireCurrentAdmin } from "@/lib/auth";
import { syncProductBrandAssignmentForProduct } from "@/lib/brand-store";
import { archiveProduct, createProduct, deleteProduct, updateProduct } from "@/lib/commerce-store";
import { POST as CREATE_PRODUCT } from "./route";
import { DELETE, PATCH, POST as UPDATE_PRODUCT_ACTION } from "./[id]/route";
import type { ProductDisclosureNotes } from "@/lib/product-disclosure-notes";

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
  deleteProduct: vi.fn(),
  archiveProduct: vi.fn()
}));

vi.mock("@/lib/brand-store", () => ({
  syncProductBrandAssignmentForProduct: vi.fn()
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
  disclosureNotes: completeDisclosureNotes(),
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
    vi.mocked(deleteProduct).mockResolvedValue(undefined);
    vi.mocked(archiveProduct).mockResolvedValue(undefined);
    vi.mocked(syncProductBrandAssignmentForProduct).mockResolvedValue({ id: "assignment_1" } as never);
  });

  it("blocks unauthenticated product creation before touching storage", async () => {
    vi.mocked(requireCurrentAdmin).mockRejectedValue(new AuthRequiredError());

    const response = await CREATE_PRODUCT(jsonRequest(validPayload));

    expect(response.status).toBe(401);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("creates a draft with normalized video, cents, gallery, and structured detail rows", async () => {
    const response = await CREATE_PRODUCT(jsonRequest(validPayload));
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
        disclosureNotes: validPayload.disclosureNotes,
        detailSections: validPayload.detailSections,
        detailActorId: "admin_1",
        status: "draft"
      })
    );
    expect(syncProductBrandAssignmentForProduct).not.toHaveBeenCalled();
  });

  it("creates a draft when disclosure notes are omitted", async () => {
    const draftPayload = withoutDisclosureNotes(validPayload);

    const response = await CREATE_PRODUCT(jsonRequest(draftPayload));

    expect(response.status).toBe(200);
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        disclosureNotes: expect.objectContaining({
          curatorsNote: expect.objectContaining({ selectionReason: "" })
        }),
        status: "draft"
      })
    );
  });

  it("rejects active creation when disclosure notes are incomplete", async () => {
    const response = await CREATE_PRODUCT(jsonRequest({
      ...validPayload,
      disclosureNotes: {
        ...completeDisclosureNotes(),
        beforeYouBuy: {
          ...completeDisclosureNotes().beforeYouBuy,
          returnsNote: ""
        }
      },
      status: "active"
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Returns note/);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("syncs a brand partner assignment only when creation payload includes the relationship field", async () => {
    const response = await CREATE_PRODUCT(jsonRequest({
      ...validPayload,
      brandPartnerId: "brand_1",
      canEditDetails: false
    }));

    expect(response.status).toBe(200);
    expect(syncProductBrandAssignmentForProduct).toHaveBeenCalledWith({
      productId: "product_1",
      brandId: "brand_1",
      canEditDetails: false,
      assignedBy: "admin_1"
    });
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
        disclosureNotes: validPayload.disclosureNotes,
        detailActorId: "admin_1",
        status: "active"
      })
    );
    expect(syncProductBrandAssignmentForProduct).not.toHaveBeenCalled();
  });

  it("rejects active product updates without complete disclosure notes", async () => {
    const payloadWithoutDisclosure = withoutDisclosureNotes(validPayload);
    const response = await PATCH(
      jsonRequest({ ...payloadWithoutDisclosure, status: "active" }),
      { params: Promise.resolve({ id: "product_1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Curator's Note/);
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("treats explicit null brandPartnerId as an unlink request on PATCH", async () => {
    const response = await PATCH(
      jsonRequest({ ...validPayload, brandPartnerId: null }),
      { params: Promise.resolve({ id: "product_1" }) }
    );

    expect(response.status).toBe(200);
    expect(syncProductBrandAssignmentForProduct).toHaveBeenCalledWith({
      productId: "product_1",
      brandId: null,
      canEditDetails: true,
      assignedBy: "admin_1"
    });
  });

  it("hard deletes products with DELETE", async () => {
    const response = await DELETE(new Request("http://test.local/api/admin/products/product_1"), {
      params: Promise.resolve({ id: "product_1" })
    });

    expect(response.status).toBe(200);
    expect(deleteProduct).toHaveBeenCalledWith("product_1");
    expect(archiveProduct).not.toHaveBeenCalled();
  });

  it("archives products through an explicit product action", async () => {
    const response = await UPDATE_PRODUCT_ACTION(jsonRequest({ action: "archive" }), {
      params: Promise.resolve({ id: "product_1" })
    });

    expect(response.status).toBe(200);
    expect(archiveProduct).toHaveBeenCalledWith("product_1");
    expect(deleteProduct).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://test.local/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function withoutDisclosureNotes<T extends { disclosureNotes?: unknown }>(value: T) {
  const copy: Partial<T> = { ...value };
  delete copy.disclosureNotes;
  return copy;
}

function completeDisclosureNotes(): ProductDisclosureNotes {
  return {
    curatorsNote: {
      selectionReason: "Selected for a refined daily routine.",
      bestFor: "Best for customers who want a simple skin-first result.",
      moodFinish: "Soft, clean, and quietly polished."
    },
    formulaBreakdown: {
      keyIngredients: "Rice extract, glycerin, and panthenol.",
      ingredientRole: "Hydration support with a comfortable finish.",
      textureFormulaNote: "Creamy texture that rinses without a tight feeling."
    },
    careCautions: {
      skinUseCautions: "Patch test before first use.",
      storageNotes: "Store away from direct sunlight.",
      regulatoryNote: "Review the package label before use."
    },
    beforeYouBuy: {
      shippingNote: "Ships from the United States fulfillment flow.",
      customsFees: "Duties and customs fees are shown before checkout when available.",
      returnsNote: "Unopened items follow the store return policy."
    }
  };
}
