import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabasePrivilegedClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

export const homeBannerFontKeys = ["brand-display", "black-sans", "standard-sans"] as const;
export const homeBannerTextColors = [
  "black",
  "white",
  "shipk-pink",
  "teal",
  "coral",
  "muted-dark"
] as const;

export type HomeBannerFontKey = (typeof homeBannerFontKeys)[number];
export type HomeBannerTextColor = (typeof homeBannerTextColors)[number];

export type HomeBanner = {
  id: string;
  topic: string;
  headline: string;
  description: string;
  backgroundImagePath: string;
  sideImagePath?: string;
  linkPath: string;
  fontKey: HomeBannerFontKey;
  textColor: HomeBannerTextColor;
  topicTextColor: HomeBannerTextColor;
  headlineTextColor: HomeBannerTextColor;
  descriptionTextColor: HomeBannerTextColor;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

type HomeBannerRow = {
  id: string;
  topic: string;
  headline: string;
  description: string;
  background_image_path: string;
  side_image_path: string | null;
  link_path: string;
  font_key: HomeBannerFontKey;
  text_color: HomeBannerTextColor;
  topic_text_color?: HomeBannerTextColor | null;
  headline_text_color?: HomeBannerTextColor | null;
  description_text_color?: HomeBannerTextColor | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

const homeBannerSelect = `
  id,
  topic,
  headline,
  description,
  background_image_path,
  side_image_path,
  link_path,
  font_key,
  text_color,
  topic_text_color,
  headline_text_color,
  description_text_color,
  sort_order,
  created_at,
  updated_at
`;

const requiredImagePath = z
  .string()
  .trim()
  .min(1, "이미지를 등록해주세요.")
  .refine(
    isAllowedBannerImagePath,
    "업로드된 이미지 URL 또는 /로 시작하는 내부 이미지 경로를 입력해주세요."
  );

const optionalImagePath = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .refine(
      isAllowedBannerImagePath,
      "업로드된 이미지 URL 또는 /로 시작하는 내부 이미지 경로를 입력해주세요."
    )
    .optional()
);

const internalLinkPath = z
  .string()
  .trim()
  .min(1, "배너 링크를 입력해주세요.")
  .refine(isInternalBannerLinkPath, "내부 링크는 /로 시작해야 하며 외부 URL은 사용할 수 없습니다.");

const optionalBannerText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return "";
      }

      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(maxLength)
  );

export const homeBannerPayloadSchema = z
  .object({
    topic: optionalBannerText(40),
    headline: optionalBannerText(90),
    description: optionalBannerText(180),
    backgroundImagePath: requiredImagePath,
    sideImagePath: optionalImagePath,
    linkPath: internalLinkPath,
    fontKey: z.enum(homeBannerFontKeys).default("brand-display"),
    textColor: z.enum(homeBannerTextColors).optional(),
    topicTextColor: z.enum(homeBannerTextColors).optional(),
    headlineTextColor: z.enum(homeBannerTextColors).optional(),
    descriptionTextColor: z.enum(homeBannerTextColors).optional()
  })
  .transform((payload) => {
    const fallbackTextColor = payload.textColor ?? "black";

    return {
      ...payload,
      textColor: fallbackTextColor,
      topicTextColor: payload.topicTextColor ?? fallbackTextColor,
      headlineTextColor: payload.headlineTextColor ?? fallbackTextColor,
      descriptionTextColor: payload.descriptionTextColor ?? fallbackTextColor
    };
  });

export type HomeBannerPayload = z.infer<typeof homeBannerPayloadSchema>;

export class HomeBannerOrderError extends Error {
  status = 400;
}

export class HomeBannerSetupRequiredError extends Error {
  status = 503;

  constructor() {
    super("Home banner table is not ready. Apply Supabase migrations before managing banners.");
  }
}

export async function listHomeBanners() {
  const supabase = await createSupabaseServerClient();
  return listHomeBannersWithClient(supabase, { allowMissingTable: true });
}

export async function listAdminHomeBanners() {
  const supabase = createSupabasePrivilegedClient();
  return listHomeBannersWithClient(supabase);
}

export async function createHomeBanner(input: unknown) {
  const payload = homeBannerPayloadSchema.parse(input);
  const supabase = createSupabasePrivilegedClient();
  const sortOrder = await getNextHomeBannerSortOrder(supabase);
  const { data, error } = await supabase
    .from("home_banners")
    .insert(buildHomeBannerMutation(payload, sortOrder))
    .select(homeBannerSelect)
    .single();

  if (error) {
    throw new Error(`Could not create home banner: ${error.message}`);
  }

  if (!data) {
    throw new Error("Home banner was saved without returning a row");
  }

  return mapHomeBannerRow(data as HomeBannerRow);
}

export async function updateHomeBanner(id: string, input: unknown) {
  const payload = homeBannerPayloadSchema.parse(input);
  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase
    .from("home_banners")
    .update(buildHomeBannerMutation(payload))
    .eq("id", id)
    .select(homeBannerSelect)
    .single();

  if (error) {
    throw new Error(`Could not update home banner: ${error.message}`);
  }

  if (!data) {
    throw new Error("Home banner was updated without returning a row");
  }

  return mapHomeBannerRow(data as HomeBannerRow);
}

export async function deleteHomeBanner(id: string) {
  const supabase = createSupabasePrivilegedClient();
  const { error } = await supabase.from("home_banners").delete().eq("id", id);

  if (error) {
    throw new Error(`Could not delete home banner: ${error.message}`);
  }

  return normalizeHomeBannerOrder(supabase);
}

export async function reorderHomeBanners(ids: string[]) {
  assertValidBannerIdList(ids);
  const currentBanners = await listAdminHomeBanners();
  const currentIds = currentBanners.map((banner) => banner.id);

  if (!sameIdSet(ids, currentIds)) {
    throw new HomeBannerOrderError("Banner reorder payload must include every banner exactly once");
  }

  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase.rpc("reorder_home_banners", { p_banner_ids: ids });

  if (error) {
    throw new Error(`Could not reorder home banners: ${error.message}`);
  }

  return ((data ?? []) as HomeBannerRow[]).map(mapHomeBannerRow);
}

export function mapHomeBannerRow(row: HomeBannerRow): HomeBanner {
  return {
    id: row.id,
    topic: row.topic,
    headline: row.headline,
    description: row.description,
    backgroundImagePath: row.background_image_path,
    sideImagePath: row.side_image_path ?? undefined,
    linkPath: row.link_path,
    fontKey: row.font_key,
    textColor: row.text_color,
    topicTextColor: row.topic_text_color ?? row.text_color,
    headlineTextColor: row.headline_text_color ?? row.text_color,
    descriptionTextColor: row.description_text_color ?? row.text_color,
    sortOrder: row.sort_order,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

export function isInternalBannerLinkPath(value: string) {
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://") ||
    /[\s\\]/.test(trimmed)
  ) {
    return false;
  }

  try {
    const url = new URL(trimmed, "https://ship-k.local");
    return url.origin === "https://ship-k.local" && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}

async function listHomeBannersWithClient(
  supabase: SupabaseClient,
  options: { allowMissingTable?: boolean } = {}
) {
  const { data, error } = await supabase
    .from("home_banners")
    .select(homeBannerSelect)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (options.allowMissingTable && isMissingHomeBannersTableError(error)) {
      return [];
    }

    if (isMissingHomeBannersTableError(error)) {
      throw new HomeBannerSetupRequiredError();
    }

    throw new Error(`Could not load home banners: ${error.message}`);
  }

  return ((data ?? []) as HomeBannerRow[]).map(mapHomeBannerRow);
}

async function getNextHomeBannerSortOrder(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("home_banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load home banner sort order: ${error.message}`);
  }

  const row = data as { sort_order?: number } | null;
  return (row?.sort_order ?? 0) + 1;
}

async function normalizeHomeBannerOrder(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("normalize_home_banner_order");

  if (error) {
    throw new Error(`Could not normalize home banner order: ${error.message}`);
  }

  return ((data ?? []) as HomeBannerRow[]).map(mapHomeBannerRow);
}

function buildHomeBannerMutation(payload: HomeBannerPayload, sortOrder?: number) {
  return {
    topic: payload.topic,
    headline: payload.headline,
    description: payload.description,
    background_image_path: payload.backgroundImagePath,
    side_image_path: payload.sideImagePath ?? null,
    link_path: payload.linkPath,
    font_key: payload.fontKey,
    text_color: payload.headlineTextColor,
    topic_text_color: payload.topicTextColor,
    headline_text_color: payload.headlineTextColor,
    description_text_color: payload.descriptionTextColor,
    ...(sortOrder ? { sort_order: sortOrder } : {})
  };
}

function isAllowedBannerImagePath(value: string) {
  const trimmed = value.trim();

  if (isAppRelativeImagePath(trimmed)) {
    return true;
  }

  return isSupabaseStorageImagePath(trimmed);
}

function isAppRelativeImagePath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://") ||
    /[\s\\]/.test(value)
  ) {
    return false;
  }

  try {
    const url = new URL(value, "https://ship-k.local");
    return url.origin === "https://ship-k.local" && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}

function isSupabaseStorageImagePath(value: string) {
  if (!/^https:\/\//i.test(value)) {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return false;
  }

  try {
    const imageUrl = new URL(value);
    const configuredUrl = new URL(supabaseUrl);

    return (
      imageUrl.origin === configuredUrl.origin &&
      imageUrl.pathname.startsWith("/storage/v1/object/public/product-images/")
    );
  } catch {
    return false;
  }
}

export function isMissingHomeBannersTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "PGRST205" ||
    /Could not find the table ['"]public\.home_banners['"] in the schema cache/i.test(
      candidate.message ?? ""
    )
  );
}

function assertValidBannerIdList(ids: string[]) {
  if (!Array.isArray(ids)) {
    throw new HomeBannerOrderError("Banner ids must be an array");
  }

  if (new Set(ids).size !== ids.length) {
    throw new HomeBannerOrderError("Banner reorder payload contains duplicates");
  }

  if (ids.some((id) => typeof id !== "string" || !id.trim())) {
    throw new HomeBannerOrderError("Banner reorder payload contains invalid ids");
  }
}

function sameIdSet(nextIds: string[], currentIds: string[]) {
  if (nextIds.length !== currentIds.length) {
    return false;
  }

  const current = new Set(currentIds);
  return nextIds.every((id) => current.has(id));
}
