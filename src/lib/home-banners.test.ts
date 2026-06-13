import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHomeBanner,
  homeBannerPayloadSchema,
  isInternalBannerLinkPath,
  listHomeBanners,
  listAdminHomeBanners,
  mapHomeBannerRow,
  reorderHomeBanners
} from "./home-banners";
import { createSupabasePrivilegedClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

vi.mock("./supabase/admin", () => ({
  createSupabasePrivilegedClient: vi.fn()
}));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));

describe("home banner payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    }
  });

  it("allows a banner with only a background image and no side image", () => {
    const parsed = homeBannerPayloadSchema.parse({
      topic: "TODAY",
      headline: "Fresh home focus",
      description: "A merchandised banner without a side image.",
      backgroundImagePath: "/background.png",
      sideImagePath: "",
      linkPath: "/shop",
      fontKey: "brand-display",
      topicTextColor: "shipk-pink",
      headlineTextColor: "white",
      descriptionTextColor: "teal"
    });

    expect(parsed.sideImagePath).toBeUndefined();
    expect(parsed.textColor).toBe("black");
    expect(parsed.topicTextColor).toBe("shipk-pink");
    expect(parsed.headlineTextColor).toBe("white");
    expect(parsed.descriptionTextColor).toBe("teal");
  });

  it("allows a banner with only a background image and no visible copy", () => {
    const parsed = homeBannerPayloadSchema.parse({
      topic: " ",
      backgroundImagePath: "/background.png",
      linkPath: "/shop",
      fontKey: "brand-display"
    });

    expect(parsed.topic).toBe("");
    expect(parsed.headline).toBe("");
    expect(parsed.description).toBe("");
    expect(parsed.sideImagePath).toBeUndefined();
    expect(parsed.textColor).toBe("black");
  });

  it("keeps legacy textColor payloads compatible for both editable text colors", () => {
    const parsed = homeBannerPayloadSchema.parse({
      topic: "TODAY",
      headline: "Fresh home focus",
      description: "A merchandised banner.",
      backgroundImagePath: "/background.png",
      linkPath: "/shop",
      fontKey: "brand-display",
      textColor: "coral"
    });

    expect(parsed.topicTextColor).toBe("coral");
    expect(parsed.headlineTextColor).toBe("coral");
    expect(parsed.descriptionTextColor).toBe("coral");
  });

  it("allows configured Supabase storage images and rejects arbitrary external images", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ship-k.supabase.co";

    expect(() =>
      homeBannerPayloadSchema.parse({
        topic: "TODAY",
        headline: "Fresh home focus",
        description: "A merchandised banner.",
        backgroundImagePath:
          "https://ship-k.supabase.co/storage/v1/object/public/product-images/admin/banners/background.png",
        sideImagePath:
          "https://ship-k.supabase.co/storage/v1/object/public/product-images/admin/banners/side.png",
        linkPath: "/shop",
        fontKey: "brand-display",
        textColor: "black"
      })
    ).not.toThrow();

    for (const backgroundImagePath of [
      "https://example.com/background.png",
      "https://other.supabase.co/storage/v1/object/public/product-images/admin/banners/background.png",
      "//example.com/background.png",
      "/\\evil.png"
    ]) {
      expect(() =>
        homeBannerPayloadSchema.parse({
          topic: "TODAY",
          headline: "Fresh home focus",
          description: "A merchandised banner.",
          backgroundImagePath,
          linkPath: "/shop",
          fontKey: "brand-display",
          textColor: "black"
        })
      ).toThrow(/업로드된 이미지 URL/);
    }
  });

  it("rejects external banner links", () => {
    expect(isInternalBannerLinkPath("/products/glow-set")).toBe(true);
    expect(isInternalBannerLinkPath("/shop?category=skincare")).toBe(true);
    expect(isInternalBannerLinkPath("https://example.com/products/glow-set")).toBe(false);
    expect(isInternalBannerLinkPath("//example.com/products/glow-set")).toBe(false);
    expect(isInternalBannerLinkPath("/\\evil.com")).toBe(false);
    expect(isInternalBannerLinkPath("/\\t/evil.com")).toBe(false);
    expect(isInternalBannerLinkPath("/shop item")).toBe(false);

    for (const linkPath of [
      "https://example.com/products/glow-set",
      "/\\evil.com",
      "/\\t/evil.com",
      "/shop item"
    ]) {
      expect(() =>
        homeBannerPayloadSchema.parse({
          topic: "TODAY",
          headline: "Fresh home focus",
          description: "A merchandised banner.",
          backgroundImagePath: "/background.png",
          linkPath,
          fontKey: "brand-display",
          textColor: "black"
        })
      ).toThrow(/내부 링크/);
    }
  });

  it("maps nullable side images to optional app fields", () => {
    expect(
      mapHomeBannerRow({
        id: "banner_1",
        topic: "TOPIC",
        headline: "Headline",
        description: "Description",
        background_image_path: "/banner.png",
        side_image_path: null,
        link_path: "/shop",
        font_key: "black-sans",
        text_color: "white",
        topic_text_color: "coral",
        headline_text_color: "shipk-pink",
        description_text_color: "teal",
        sort_order: 1,
        created_at: null,
        updated_at: null
      } as never)
    ).toMatchObject({
      backgroundImagePath: "/banner.png",
      sideImagePath: undefined,
      topicTextColor: "coral",
      headlineTextColor: "shipk-pink",
      descriptionTextColor: "teal"
    });
  });

  it("stores a missing side image as null on create", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "banner_1",
            topic: "TODAY",
            headline: "Fresh home focus",
            description: "A merchandised banner without a side image.",
            background_image_path: "/background.png",
            side_image_path: null,
            link_path: "/shop",
            font_key: "brand-display",
            text_color: "black",
            topic_text_color: "shipk-pink",
            headline_text_color: "black",
            description_text_color: "teal",
            sort_order: 4,
            created_at: "2026-06-13T00:00:00.000Z",
            updated_at: "2026-06-13T00:00:00.000Z"
          },
          error: null
        })
      }))
    }));
    const from = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { sort_order: 3 }, error: null })
            }))
          }))
        }))
      })
      .mockReturnValueOnce({ insert });

    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({ from } as never);

    await createHomeBanner({
      topic: "TODAY",
      headline: "Fresh home focus",
      description: "A merchandised banner without a side image.",
      backgroundImagePath: "/background.png",
      linkPath: "/shop",
      fontKey: "brand-display",
      topicTextColor: "shipk-pink",
      headlineTextColor: "black",
      descriptionTextColor: "teal"
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        background_image_path: "/background.png",
        side_image_path: null,
        text_color: "black",
        topic_text_color: "shipk-pink",
        headline_text_color: "black",
        description_text_color: "teal",
        sort_order: 4
      })
    );
  });

  it("lets the public home page fall back while the banner migration is absent", async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.home_banners' in the schema cache"
      }
    });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const select = vi.fn(() => ({ order: firstOrder }));
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({ select }))
    } as never);

    await expect(listHomeBanners()).resolves.toEqual([]);
  });

  it("surfaces missing banner table as an admin setup error", async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.home_banners' in the schema cache"
      }
    });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const select = vi.fn(() => ({ order: firstOrder }));
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({
      from: vi.fn(() => ({ select }))
    } as never);

    await expect(listAdminHomeBanners()).rejects.toThrow(/Home banner table is not ready/);
  });

  it("rejects duplicate reorder ids before touching the database", async () => {
    await expect(reorderHomeBanners(["banner_1", "banner_1"])).rejects.toThrow(/duplicates/);
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });
});
