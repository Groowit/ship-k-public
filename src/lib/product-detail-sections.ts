import { z } from "zod";

export const productDetailSectionTypes = [
  "heading",
  "text",
  "image",
  "long_detail_image",
  "image_text",
  "image_group",
  "video",
  "comparison",
  "steps",
  "notice"
] as const;

export const productDetailSectionSchemaVersion = 1;
export const maxProductDetailSections = 40;

const maxPayloadBytes = 160_000;
const alignSchema = z.enum(["left", "center", "right"]).default("left");
const headingLevelSchema = z.enum(["h2", "h3"]).default("h2");
const imagePositionSchema = z.enum(["left", "right"]).default("left");
const imageAspectRatioSchema = z.enum(["natural", "square", "video"]).default("natural");
const longImageWidthSchema = z.enum(["default", "wide", "full"]).default("default");
const noticeToneSchema = z.enum(["info", "tip", "warning"]).default("info");
const stepsLayoutSchema = z.enum(["split_cards", "full_cards", "timeline", "simple_list"]).default("split_cards");
const headingFontSizeSchema = z.enum(["medium", "large", "display", "hero"]);
const bodyFontSizeSchema = z.enum(["small", "base", "large", "xlarge"]);
const textColorSchema = z.enum(["default", "muted", "pink", "blue", "mint", "coral"]);
const fontWeightSchema = z.enum(["regular", "medium", "bold", "black"]);

const sectionBaseSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().positive().optional(),
  schemaVersion: z.literal(productDetailSectionSchemaVersion)
});

const safeText = (max: number) => z.string().trim().min(1).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const publicPathOrHttpsUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(isPublicPathOrHttpsUrl, "공개 경로 또는 HTTPS URL을 입력해주세요.");

const imageItemSchema = z
  .object({
    src: publicPathOrHttpsUrlSchema,
    alt: safeText(180),
    caption: optionalText(240)
  })
  .strict();

const comparisonItemSchema = z
  .object({
    label: safeText(80),
    body: safeText(360)
  })
  .strict();

const stepItemSchema = z
  .object({
    title: safeText(100),
    body: safeText(420)
  })
  .strict();

const headingSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("heading"),
    text: safeText(140),
    level: headingLevelSchema,
    align: alignSchema,
    fontSize: headingFontSizeSchema.optional(),
    textColor: textColorSchema.optional()
  })
  .strict();

const textSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("text"),
    body: safeText(4000),
    align: alignSchema,
    fontSize: bodyFontSizeSchema.optional(),
    textColor: textColorSchema.optional(),
    fontWeight: fontWeightSchema.optional()
  })
  .strict();

const imageSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("image"),
    src: publicPathOrHttpsUrlSchema,
    alt: safeText(180),
    caption: optionalText(240),
    aspectRatio: imageAspectRatioSchema
  })
  .strict();

const longDetailImageSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("long_detail_image"),
    src: publicPathOrHttpsUrlSchema,
    alt: safeText(180),
    caption: optionalText(240),
    maxWidth: longImageWidthSchema
  })
  .strict();

const imageTextSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("image_text"),
    src: publicPathOrHttpsUrlSchema,
    alt: safeText(180),
    eyebrow: optionalText(80),
    title: safeText(140),
    body: safeText(1600),
    imagePosition: imagePositionSchema,
    titleSize: headingFontSizeSchema.optional(),
    titleColor: textColorSchema.optional(),
    bodySize: bodyFontSizeSchema.optional(),
    bodyColor: textColorSchema.optional()
  })
  .strict();

const imageGroupSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("image_group"),
    title: optionalText(140),
    images: z.array(imageItemSchema).min(1).max(8),
    titleSize: headingFontSizeSchema.optional(),
    titleColor: textColorSchema.optional()
  })
  .strict();

const videoSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("video"),
    title: optionalText(140),
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .transform(normalizeEmbeddableVideoUrl)
      .refine(isEmbeddableVideoUrl, "YouTube, Vimeo, Cloudflare Stream 임베드 URL만 사용할 수 있습니다.")
  })
  .strict();

const comparisonSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("comparison"),
    title: safeText(140),
    items: z.array(comparisonItemSchema).min(1).max(6),
    titleSize: headingFontSizeSchema.optional(),
    titleColor: textColorSchema.optional(),
    bodySize: bodyFontSizeSchema.optional(),
    bodyColor: textColorSchema.optional()
  })
  .strict();

const stepsSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("steps"),
    title: optionalText(140),
    items: z.array(stepItemSchema).min(1).max(12),
    layout: stepsLayoutSchema,
    titleSize: headingFontSizeSchema.optional(),
    titleColor: textColorSchema.optional(),
    bodySize: bodyFontSizeSchema.optional(),
    bodyColor: textColorSchema.optional()
  })
  .strict();

const noticeSectionSchema = sectionBaseSchema
  .extend({
    sectionType: z.literal("notice"),
    title: safeText(140),
    body: safeText(1200),
    tone: noticeToneSchema,
    titleSize: headingFontSizeSchema.optional(),
    titleColor: textColorSchema.optional(),
    bodySize: bodyFontSizeSchema.optional(),
    bodyColor: textColorSchema.optional()
  })
  .strict();

export const productDetailSectionInputSchema = z.discriminatedUnion("sectionType", [
  headingSectionSchema,
  textSectionSchema,
  imageSectionSchema,
  longDetailImageSectionSchema,
  imageTextSectionSchema,
  imageGroupSectionSchema,
  videoSectionSchema,
  comparisonSectionSchema,
  stepsSectionSchema,
  noticeSectionSchema
]);

export const productDetailSectionsPayloadSchema = z
  .object({
    sections: z.array(productDetailSectionInputSchema).max(maxProductDetailSections)
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (JSON.stringify(payload).length > maxPayloadBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: "상세 콘텐츠가 너무 큽니다. 섹션 또는 이미지 수를 줄여주세요."
      });
    }
  });

export type ProductDetailSectionInput = z.infer<typeof productDetailSectionInputSchema>;
export type ProductDetailSection = ProductDetailSectionInput & {
  id: string;
  sortOrder: number;
};
export type ProductDetailSectionsPayload = z.infer<typeof productDetailSectionsPayloadSchema>;

export type ProductDetailSectionRow = {
  id: string;
  sort_order: number;
  section_type: (typeof productDetailSectionTypes)[number];
  schema_version: number;
  content: Record<string, unknown>;
};

export function mapProductDetailSectionRow(row: ProductDetailSectionRow): ProductDetailSection {
  const parsed = productDetailSectionInputSchema.parse({
    id: row.id,
    sortOrder: row.sort_order,
    schemaVersion: row.schema_version,
    sectionType: row.section_type,
    ...row.content
  });

  return {
    ...parsed,
    id: row.id,
    sortOrder: row.sort_order
  };
}

export function toProductDetailSectionRpcPayload(sections: ProductDetailSectionInput[]) {
  return sections.map((section) => ({
    section_type: section.sectionType,
    schema_version: section.schemaVersion,
    content: sectionContentForStorage(section)
  }));
}

export function sectionContentForStorage(section: ProductDetailSectionInput) {
  const content: Record<string, unknown> = { ...section };
  delete content.id;
  delete content.sortOrder;
  delete content.schemaVersion;
  delete content.sectionType;
  return content;
}

export function createDefaultDetailSections({
  description,
  bestFor,
  result,
  heroImagePath,
  productName
}: {
  description: string;
  bestFor?: string;
  result?: string;
  heroImagePath: string;
  productName: string;
}): ProductDetailSectionInput[] {
  return [
    {
      id: "draft-heading",
      sectionType: "heading",
      schemaVersion: productDetailSectionSchemaVersion,
      text: result || "제품 상세 스토리",
      level: "h2",
      align: "left"
    },
    {
      id: "draft-text",
      sectionType: "text",
      schemaVersion: productDetailSectionSchemaVersion,
      body: description || "브랜드의 제품 스토리를 작성해주세요.",
      align: "left"
    },
    {
      id: "draft-notice",
      sectionType: "notice",
      schemaVersion: productDetailSectionSchemaVersion,
      title: "추천 사용 상황",
      body: bestFor || "이 제품을 추천하는 상황을 작성해주세요.",
      tone: "tip"
    },
    {
      id: "draft-image",
      sectionType: "image",
      schemaVersion: productDetailSectionSchemaVersion,
      src: heroImagePath,
      alt: `${productName} 상세 이미지`,
      aspectRatio: "natural"
    }
  ];
}

function isPublicPathOrHttpsUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeEmbeddableVideoUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }

    if (url.hostname.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) {
        return `https://www.youtube.com/embed/${watchId}`;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : value;
      }
    }

    if (url.hostname === "vimeo.com") {
      const id = url.pathname.replace("/", "");
      return id ? `https://player.vimeo.com/video/${id}` : value;
    }
  } catch {
    return value;
  }

  return value;
}

function isEmbeddableVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname.includes("youtube.com") ||
        url.hostname === "player.vimeo.com" ||
        url.hostname.includes("cloudflarestream.com") ||
        url.hostname === "iframe.videodelivery.net")
    );
  } catch {
    return false;
  }
}
