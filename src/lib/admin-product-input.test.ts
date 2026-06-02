import { describe, expect, it } from "vitest";
import { adminProductPayloadSchema } from "./admin-product-input";

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

    expect(() =>
      adminProductPayloadSchema.parse({
        ...draft,
        status: "active"
      })
    ).toThrow(/대표 이미지/);
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
});
