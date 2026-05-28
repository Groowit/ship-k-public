import { describe, expect, it } from "vitest";
import { brandProductContentPayloadSchema } from "./brand-product-input";

describe("brandProductContentPayloadSchema", () => {
  it("parses canonical customer-facing detail sections", () => {
    const parsed = brandProductContentPayloadSchema.parse({
      sections: [
        {
          sectionType: "heading",
          schemaVersion: 1,
          text: "바다 수분감이 터지는 루틴",
          level: "h2",
          align: "left"
        },
        {
          sectionType: "long_detail_image",
          schemaVersion: 1,
          src: "/catalog-assets/brand-samples/bubble-tide-hero.png",
          alt: "Bubble Tide 긴 상세 이미지",
          caption: "Figma에서 만든 긴 상세 이미지도 그대로 배치할 수 있습니다.",
          maxWidth: "wide"
        },
        {
          sectionType: "steps",
          schemaVersion: 1,
          title: "사용 순서",
          items: [
            {
              title: "세안 후",
              body: "물기를 가볍게 정돈합니다."
            }
          ]
        }
      ]
    });

    expect(parsed.sections).toHaveLength(3);
    expect(parsed.sections[1]).toMatchObject({
      sectionType: "long_detail_image",
      maxWidth: "wide"
    });
    expect(parsed.sections[2]).toMatchObject({
      sectionType: "steps",
      layout: "split_cards"
    });
  });

  it("normalizes embeddable video URLs", () => {
    const parsed = brandProductContentPayloadSchema.parse({
      sections: [
        {
          sectionType: "video",
          schemaVersion: 1,
          title: "루틴 영상",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      ]
    });

    expect(parsed.sections[0]).toMatchObject({
      sectionType: "video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    });
  });

  it("rejects commerce and product identity fields from brand updates", () => {
    expect(() =>
      brandProductContentPayloadSchema.parse({
        sections: [
          {
            sectionType: "text",
            schemaVersion: 1,
            body: "브랜드 본문",
            align: "left"
          }
        ],
        priceUsd: 29,
        sku: "BRAND-SHOULD-NOT-EDIT",
        stockQuantity: 10,
        status: "active",
        name: "이름 변경 시도",
        brandName: "브랜드 변경 시도"
      })
    ).toThrow(/Unrecognized key/);
  });

  it("rejects unsafe image URLs", () => {
    expect(() =>
      brandProductContentPayloadSchema.parse({
        sections: [
          {
            sectionType: "image",
            schemaVersion: 1,
            src: "javascript:alert(1)",
            alt: "위험 이미지",
            aspectRatio: "natural"
          }
        ]
      })
    ).toThrow(/공개 경로 또는 HTTPS URL/);
  });
});
