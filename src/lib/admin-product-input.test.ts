import { describe, expect, it } from "vitest";
import { adminProductPayloadSchema } from "./admin-product-input";
import type { ProductDisclosureNotes } from "./product-disclosure-notes";

describe("adminProductPayloadSchema", () => {
  it("parses set metadata, included items, and routine steps", () => {
    const parsed = adminProductPayloadSchema.parse({
      productType: "set",
      brandName: "shipK Curated",
      name: "Date Night Demo",
      category: "Makeup",
      tags: [" lip tint ", "gloss"],
      difficulty: "Intermediate",
      itemCount: "6",
      shortDescription: "A fictional evening look kit.",
      description: "A demo set assembled for product testing.",
      priceUsd: "59.00",
      stockQuantity: "12",
      heroImagePath: "https://example.com/date-night.png",
      introVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      galleryImages:
        '[{"imagePath":"https://example.com/date-gallery.png","altText":"Date Night gallery"}]',
      includedItems:
        '[{"name":"Velvet Prep Cream","category":"Skincare","description":"A fictional prep step."}]',
      routineSteps:
        '[{"title":"Prep the base","body":"Apply a light layer before color."}]',
      contentBlocks:
        '[{"type":"text","eyebrow":"Story","title":"Evening ready","body":"A clear routine story."}]',
      detailSections:
        '[{"sectionType":"heading","schemaVersion":1,"text":"Evening story","level":"h2","align":"left"},{"sectionType":"text","schemaVersion":1,"body":"A customer-facing document body.","align":"left"}]',
      disclosureNotes: completeDisclosureNotes(),
      status: "active"
    });

    expect(parsed).toMatchObject({
      productType: "set",
      category: "Makeup",
      tags: ["LIP TINT", "GLOSS"],
      difficulty: "Intermediate",
      itemCount: 6,
      priceUsd: 59,
      stockQuantity: 12,
      introVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    });
    expect(parsed.galleryImages).toHaveLength(1);
    expect(parsed.includedItems).toHaveLength(1);
    expect(parsed.routineSteps).toHaveLength(1);
    expect(parsed.contentBlocks).toHaveLength(1);
    expect(parsed.detailSections).toHaveLength(2);
    expect(parsed.disclosureNotes.curatorsNote.selectionReason).toBe("Selected for a refined daily routine.");
  });

  it("allows incomplete draft products but blocks incomplete publish attempts", () => {
    const draft = adminProductPayloadSchema.parse({
      productType: "set",
      brandName: "shipK Curated",
      name: "Draft Set",
      category: "Skincare",
      shortDescription: "Draft",
      description: "Draft description",
      priceUsd: "39.00",
      stockQuantity: "0",
      status: "draft"
    });

    expect(draft.status).toBe("draft");
    expect(draft.includedItems).toEqual([]);
    expect(draft.disclosureNotes.curatorsNote.selectionReason).toBe("");

    expect(() =>
      adminProductPayloadSchema.parse({
        ...draft,
        status: "active"
      })
    ).toThrow(/대표 이미지/);
  });

  it("requires every disclosure note field for active products", () => {
    const activePayload = {
      productType: "set",
      brandName: "shipK Curated",
      name: "Disclosure Set",
      category: "Skincare",
      difficulty: "Beginner",
      shortDescription: "Disclosure",
      description: "Disclosure description",
      priceUsd: "39.00",
      stockQuantity: "1",
      heroImagePath: "/catalog-assets/admin-product-placeholder.svg",
      includedItems: [{ name: "Item", category: "Skincare", description: "Usage" }],
      routineSteps: [{ title: "Step", body: "Do it" }],
      disclosureNotes: {
        ...completeDisclosureNotes(),
        beforeYouBuy: {
          ...completeDisclosureNotes().beforeYouBuy,
          customsFees: ""
        }
      },
      status: "active"
    };

    expect(() => adminProductPayloadSchema.parse(activePayload)).toThrow(/Customs \/ fees/);
    expect(
      adminProductPayloadSchema.parse({
        ...activePayload,
        disclosureNotes: completeDisclosureNotes()
      }).disclosureNotes.beforeYouBuy.customsFees
    ).toBe("Duties and customs fees are shown before checkout when available.");
  });

  it("keeps disclosure labels fixed outside the payload", () => {
    expect(() =>
      adminProductPayloadSchema.parse({
        productType: "set",
        brandName: "shipK Curated",
        name: "Draft Set",
        category: "Skincare",
        shortDescription: "Draft",
        description: "Draft description",
        priceUsd: "39.00",
        stockQuantity: "0",
        disclosureNotes: {
          ...completeDisclosureNotes(),
          labels: ["Editable label"]
        },
        status: "draft"
      })
    ).toThrow(/Unrecognized key/);
  });

  it("keeps brand partner assignment input explicit and nullable", () => {
    const basePayload = {
      productType: "set",
      brandName: "shipK Curated",
      name: "Draft Set",
      category: "Skincare",
      shortDescription: "Draft",
      description: "Draft description",
      priceUsd: "39.00",
      stockQuantity: "0",
      status: "draft"
    };

    expect(adminProductPayloadSchema.parse(basePayload)).not.toHaveProperty("brandPartnerId");
    expect(adminProductPayloadSchema.parse({ ...basePayload, brandPartnerId: "" }).brandPartnerId).toBeNull();
    expect(
      adminProductPayloadSchema.parse({
        ...basePayload,
        brandPartnerId: "brand_1",
        canEditDetails: false
      })
    ).toMatchObject({
      brandPartnerId: "brand_1",
      canEditDetails: false
    });
  });

  it("rejects non-embeddable intro video URLs", () => {
    expect(() =>
      adminProductPayloadSchema.parse({
        productType: "set",
        brandName: "shipK Curated",
        name: "Video Test",
        category: "Skincare",
        difficulty: "Beginner",
        shortDescription: "Video",
        description: "Video description",
        priceUsd: "39.00",
        stockQuantity: "1",
        heroImagePath: "/catalog-assets/admin-product-placeholder.svg",
        introVideoUrl: "https://example.com/video.mp4",
        includedItems: [
          { name: "Item", category: "Skincare", description: "Usage" }
        ],
        routineSteps: [{ title: "Step", body: "Do it" }],
        status: "active"
      })
    ).toThrow(/YouTube, Vimeo, Cloudflare/);
  });

  it("rejects intro video URLs on attacker-controlled lookalike hosts", () => {
    expect(() =>
      adminProductPayloadSchema.parse({
        productType: "set",
        brandName: "shipK Curated",
        name: "Spoofed Video Test",
        category: "Skincare",
        difficulty: "Beginner",
        shortDescription: "Video",
        description: "Video description",
        priceUsd: "39.00",
        stockQuantity: "1",
        heroImagePath: "/catalog-assets/admin-product-placeholder.svg",
        introVideoUrl: "https://youtube.com.evil.test/embed/dQw4w9WgXcQ",
        includedItems: [
          { name: "Item", category: "Skincare", description: "Usage" }
        ],
        routineSteps: [{ title: "Step", body: "Do it" }],
        status: "active"
      })
    ).toThrow(/YouTube, Vimeo, Cloudflare/);
  });
});

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
