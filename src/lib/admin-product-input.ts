import { z } from "zod";
import {
  maxProductDetailSections,
  productDetailSectionInputSchema
} from "./product-detail-sections";
import { productCategories } from "./products";

const productTypeSchema = z.preprocess(
  (value) => (value === "curated_set" ? "set" : value),
  z.enum(["single", "set"])
);
const difficultySchema = z.enum(["Beginner", "Intermediate"]);
const productCategorySchema = z.enum(productCategories);
const labelListSchema = z
  .preprocess(
    parseJsonishArray,
    z.array(
      z
        .string()
        .trim()
        .min(1)
        .max(32)
        .transform((value) => value.replace(/\s+/g, " ").toUpperCase())
    ).max(6)
  )
  .default([]);

const requiredPathOrUrl = z
  .string()
  .trim()
  .min(1)
  .refine(isPublicPathOrUrl, "공개 경로 또는 HTTPS URL을 입력해주세요.");

const optionalPathOrUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || isPublicPathOrUrl(value), "공개 경로 또는 HTTPS URL을 입력해주세요.");

const optionalExternalVideoUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? normalizeIntroVideoUrl(value) : undefined))
  .refine((value) => !value || value.startsWith("https://"), "https://로 시작하는 영상 URL을 입력해주세요.")
  .refine(
    (value) => !value || isEmbeddableVideoUrl(value),
    "YouTube, Vimeo, Cloudflare Stream 임베드 URL만 사용할 수 있습니다."
  );

const optionalBrandPartnerId = z
  .preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().min(1).nullable()
  )
  .optional();

const includedItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1)
});

const routineStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1)
});

const galleryImageSchema = z.object({
  id: z.string().optional(),
  imagePath: requiredPathOrUrl,
  altText: z.string().trim().min(1, "이미지 대체 텍스트를 입력해주세요.")
});

const contentBlockSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["image", "text", "image_text"]),
    eyebrow: z.string().trim().optional().transform(emptyToUndefined),
    title: z.string().trim().optional().transform(emptyToUndefined),
    body: z.string().trim().optional().transform(emptyToUndefined),
    imagePath: optionalPathOrUrl,
    alt: z.string().trim().optional().transform(emptyToUndefined),
    imagePosition: z.enum(["left", "right"]).default("left")
  })
  .superRefine((block, ctx) => {
    if (block.type !== "image" && !block.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "텍스트 블록에는 제목이 필요합니다."
      });
    }

    if (block.type !== "image" && !block.body) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "텍스트 블록에는 본문이 필요합니다."
      });
    }

    if (block.type !== "text" && !block.imagePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imagePath"],
        message: "이미지 블록에는 이미지가 필요합니다."
      });
    }

    if (block.type !== "text" && !block.alt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alt"],
        message: "이미지 대체 텍스트를 입력해주세요."
      });
    }
  });

export const adminProductPayloadSchema = z
  .object({
    productType: productTypeSchema.default("set"),
    brandName: z.string().trim().min(1),
    brandPartnerId: optionalBrandPartnerId,
    canEditDetails: z.boolean().optional().default(true),
    name: z.string().trim().min(1),
    category: productCategorySchema.default("Skincare"),
    tags: labelListSchema,
    difficulty: difficultySchema.optional(),
    itemCount: z.coerce.number().int().min(1).max(20).optional(),
    shortDescription: z.string().trim().min(1),
    description: z.string().trim().min(1),
    bestFor: z.string().trim().optional().transform(emptyToUndefined),
    result: z.string().trim().optional().transform(emptyToUndefined),
    optionName: z.string().trim().min(1).default("Default option"),
    sku: z
      .string()
      .trim()
      .max(64)
      .optional()
      .transform((value) => value?.toUpperCase() || undefined),
    priceUsd: z.coerce.number().positive(),
    stockQuantity: z.coerce.number().int().min(0),
    heroImagePath: optionalPathOrUrl,
    introVideoUrl: optionalExternalVideoUrl,
    galleryImages: z.preprocess(parseJsonishArray, z.array(galleryImageSchema).max(12)).default([]),
    includedItems: z.preprocess(parseJsonishArray, z.array(includedItemSchema).max(20)).default([]),
    routineSteps: z.preprocess(parseJsonishArray, z.array(routineStepSchema).max(20)).default([]),
    contentBlocks: z.preprocess(parseJsonishArray, z.array(contentBlockSchema).max(20)).default([]),
    detailSections: z
      .preprocess(parseJsonishArray, z.array(productDetailSectionInputSchema).max(maxProductDetailSections))
      .default([]),
    status: z.enum(["active", "draft", "archived"]).default("draft")
  })
  .superRefine((payload, ctx) => {
    if (payload.status !== "active") {
      return;
    }

    requireField(payload.heroImagePath, ["heroImagePath"], "판매중 발행에는 대표 이미지가 필요합니다.", ctx);
    requireField(payload.category, ["category"], "판매중 발행에는 카테고리가 필요합니다.", ctx);
    requireField(payload.difficulty, ["difficulty"], "판매중 발행에는 난이도가 필요합니다.", ctx);

    if (payload.productType === "set") {
      if (payload.includedItems.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["includedItems"],
          message: "세트 상품을 발행하려면 구성품을 1개 이상 등록해야 합니다."
        });
      }

      if (payload.routineSteps.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["routineSteps"],
          message: "세트 상품을 발행하려면 사용 단계를 1개 이상 등록해야 합니다."
        });
      }
    }
  });

export type AdminProductPayload = z.infer<typeof adminProductPayloadSchema>;

function parseJsonishArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function emptyToUndefined(value: string | undefined) {
  return value || undefined;
}

function isPublicPathOrUrl(value: string) {
  return value.startsWith("/") || value.startsWith("https://");
}

function requireField(
  value: unknown,
  path: Array<string | number>,
  message: string,
  ctx: z.RefinementCtx
) {
  if (!value) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  }
}

function normalizeIntroVideoUrl(value: string) {
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
      url.hostname.includes("youtube.com") ||
      url.hostname === "player.vimeo.com" ||
      url.hostname.includes("cloudflarestream.com") ||
      url.hostname === "iframe.videodelivery.net"
    );
  } catch {
    return false;
  }
}
