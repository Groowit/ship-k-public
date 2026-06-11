import { describe, expect, it } from "vitest";
import { productDetailSectionsPayloadSchema } from "./product-detail-sections";

describe("productDetailSectionsPayloadSchema", () => {
  it("rejects video URLs on attacker-controlled lookalike hosts", () => {
    expect(() =>
      productDetailSectionsPayloadSchema.parse({
        sections: [
          {
            sectionType: "video",
            schemaVersion: 1,
            title: "Routine video",
            url: "https://cloudflarestream.com.evil.test/video/demo"
          }
        ]
      })
    ).toThrow(/YouTube, Vimeo, Cloudflare/);
  });

  it("keeps supported provider video URLs valid", () => {
    const parsed = productDetailSectionsPayloadSchema.parse({
      sections: [
        {
          sectionType: "video",
          schemaVersion: 1,
          title: "Routine video",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      ]
    });

    expect(parsed.sections[0]).toMatchObject({
      sectionType: "video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    });
  });
});
