import { describe, expect, it } from "vitest";
import { adminProductPayloadSchema } from "./admin-product-input";

describe("adminProductPayloadSchema", () => {
  it("parses curated set metadata, included items, and routine steps", () => {
    const parsed = adminProductPayloadSchema.parse({
      productType: "curated_set",
      brandName: "shipK Curated",
      name: "Date Night Demo",
      category: "Routine Kit",
      collectionSlug: "date-night",
      difficulty: "Intermediate",
      itemCount: "6",
      themeLabel: "DATE",
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
      status: "active"
    });

    expect(parsed).toMatchObject({
      productType: "curated_set",
      collectionSlug: "date-night",
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
  });

  it("allows incomplete draft products but blocks incomplete publish attempts", () => {
    const draft = adminProductPayloadSchema.parse({
      productType: "curated_set",
      brandName: "shipK Curated",
      name: "Draft Set",
      category: "Routine Kit",
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

  it("rejects non-embeddable intro video URLs", () => {
    expect(() =>
      adminProductPayloadSchema.parse({
        productType: "curated_set",
        brandName: "shipK Curated",
        name: "Video Test",
        category: "Routine Kit",
        collectionSlug: "daily-glow",
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
