import { describe, expect, it } from "vitest";
import { brandProductContentPayloadSchema } from "./brand-product-input";

describe("brandProductContentPayloadSchema", () => {
  it("parses only customer-facing detail content fields", () => {
    const parsed = brandProductContentPayloadSchema.parse({
      shortDescription: "촉촉한 유리알 광채 루틴",
      description: "브랜드가 직접 관리하는 상세 본문입니다.",
      bestFor: "건조한 아침 루틴",
      result: "맑고 편안한 윤기",
      heroImagePath: "/catalog-assets/sets/glass-skin-starter.png",
      introVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      galleryImages: [
        {
          imagePath: "https://cdn.ship-k.test/gallery.webp",
          altText: "브랜드 갤러리 이미지"
        }
      ],
      includedItems: [
        {
          name: "수분 앰플",
          category: "Ampoule",
          description: "세안 후 얇게 펴 발라주세요."
        }
      ],
      routineSteps: [
        {
          title: "앰플 바르기",
          body: "손바닥으로 가볍게 눌러 흡수시킵니다."
        }
      ],
      contentBlocks: [
        {
          type: "image_text",
          eyebrow: "브랜드 팁",
          title: "얇게 여러 번",
          body: "한 번에 많이 바르기보다 레이어링을 추천합니다.",
          imagePath: "/catalog-assets/sets/glass-skin-starter.png",
          alt: "앰플 사용 이미지",
          imagePosition: "left"
        }
      ]
    });

    expect(parsed.introVideoUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(parsed.galleryImages).toHaveLength(1);
    expect(parsed.includedItems).toHaveLength(1);
    expect(parsed.routineSteps).toHaveLength(1);
    expect(parsed.contentBlocks).toHaveLength(1);
  });

  it("rejects commerce and product identity fields from brand updates", () => {
    expect(() =>
      brandProductContentPayloadSchema.parse({
        shortDescription: "상세 설명",
        description: "브랜드 본문",
        priceUsd: 29,
        sku: "BRAND-SHOULD-NOT-EDIT",
        stockQuantity: 10,
        status: "active",
        name: "이름 변경 시도",
        brandName: "브랜드 변경 시도"
      })
    ).toThrow(/Unrecognized key/);
  });
});
