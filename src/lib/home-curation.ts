import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  hydrateProductsWithDetailSections,
  mapProductRow,
  productSelect,
  type ProductRow
} from "./commerce-store";
import type { Product } from "./products";
import { createSupabasePrivilegedClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";

const homeCurationSelect = `
  id,
  product_id,
  sort_order,
  created_at,
  updated_at,
  products(${productSelect})
`;

const homeCurationEntrySelect = `
  id,
  product_id,
  sort_order,
  created_at,
  updated_at
`;

const publicHomeCurationLimit = 12;

const homeCurationPayloadSchema = z.object({
  productId: z.string().trim().min(1, "상품을 선택해주세요.")
});

export type HomeCurationNonVisibleReason = "draft" | "archived" | "out_of_stock";

export type HomeCurationEntry = {
  id: string;
  productId: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  product: Product;
  nonVisibleReasons: HomeCurationNonVisibleReason[];
};

type HomeCurationRow = {
  id: string;
  product_id: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  products?: ProductRow | ProductRow[] | null;
};

type HomeCurationEntryRow = Omit<HomeCurationRow, "products">;

export class HomeCurationOrderError extends Error {
  status = 400;
}

export class HomeCurationDuplicateProductError extends Error {
  status = 409;

  constructor() {
    super("This product is already curated for the home shelf.");
  }
}

export class HomeCurationSetupRequiredError extends Error {
  status = 503;

  constructor() {
    super("Home curation table is not ready. Apply Supabase migrations before managing curation.");
  }
}

export async function listHomeCurationProducts() {
  const supabase = await createSupabaseServerClient();
  const entries = await listHomeCurationEntriesWithClient(supabase, {
    allowMissingTable: true
  });

  return entries
    .filter((entry) => entry.nonVisibleReasons.length === 0)
    .map((entry) => entry.product)
    .slice(0, publicHomeCurationLimit);
}

export async function listAdminHomeCurationEntries() {
  const supabase = createSupabasePrivilegedClient();
  return listHomeCurationEntriesWithClient(supabase);
}

export async function createHomeCurationEntry(input: unknown) {
  const payload = homeCurationPayloadSchema.parse(input);
  const supabase = createSupabasePrivilegedClient();
  const sortOrder = await getNextHomeCurationSortOrder(supabase);

  const { data, error } = await supabase
    .from("home_curation_products")
    .insert({
      product_id: payload.productId,
      sort_order: sortOrder
    })
    .select(homeCurationEntrySelect)
    .single();

  if (error) {
    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    if (isDuplicateHomeCurationProductError(error)) {
      throw new HomeCurationDuplicateProductError();
    }

    throw new Error(`Could not create home curation entry: ${error.message}`);
  }

  if (!data) {
    throw new Error("Home curation entry was saved without returning a row");
  }

  return listAdminHomeCurationEntries();
}

export async function deleteHomeCurationEntry(id: string) {
  const supabase = createSupabasePrivilegedClient();
  const { error } = await supabase.from("home_curation_products").delete().eq("id", id);

  if (error) {
    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    throw new Error(`Could not delete home curation entry: ${error.message}`);
  }

  return normalizeHomeCurationOrder(supabase);
}

export async function reorderHomeCurationEntries(ids: string[]) {
  assertValidCurationIdList(ids);
  const currentEntries = await listAdminHomeCurationEntries();
  const currentIds = currentEntries.map((entry) => entry.id);

  if (!sameIdSet(ids, currentIds)) {
    throw new HomeCurationOrderError("Curation reorder payload must include every entry exactly once");
  }

  const supabase = createSupabasePrivilegedClient();
  const { data, error } = await supabase.rpc("reorder_home_curation_products", {
    p_entry_ids: ids
  });

  if (error) {
    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    throw new Error(`Could not reorder home curation entries: ${error.message}`);
  }

  return hydrateHomeCurationEntryRows(supabase, (data ?? []) as HomeCurationEntryRow[]);
}

export function getHomeCurationNonVisibleReasons(product: Product): HomeCurationNonVisibleReason[] {
  const reasons: HomeCurationNonVisibleReason[] = [];

  if (product.status === "draft") {
    reasons.push("draft");
  }

  if (product.status === "archived") {
    reasons.push("archived");
  }

  if (product.option.stockQuantity <= 0) {
    reasons.push("out_of_stock");
  }

  return reasons;
}

async function listHomeCurationEntriesWithClient(
  supabase: SupabaseClient,
  options: { allowMissingTable?: boolean } = {}
) {
  const { data, error } = await supabase
    .from("home_curation_products")
    .select(homeCurationSelect)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (options.allowMissingTable && isMissingHomeCurationTableError(error)) {
      return [];
    }

    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    throw new Error(`Could not load home curation entries: ${error.message}`);
  }

  return mapHomeCurationRows(supabase, (data ?? []) as HomeCurationRow[]);
}

async function hydrateHomeCurationEntryRows(
  supabase: SupabaseClient,
  entryRows: HomeCurationEntryRow[]
) {
  if (!entryRows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("home_curation_products")
    .select(homeCurationSelect)
    .in("id", entryRows.map((row) => row.id))
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    throw new Error(`Could not load home curation entries: ${error.message}`);
  }

  return mapHomeCurationRows(supabase, (data ?? []) as HomeCurationRow[]);
}

async function mapHomeCurationRows(supabase: SupabaseClient, rows: HomeCurationRow[]) {
  const rowProducts = rows
    .map((row) => ({
      row,
      productRow: getRelationObject(row.products)
    }))
    .filter((entry): entry is { row: HomeCurationRow; productRow: ProductRow } =>
      Boolean(entry.productRow)
    );
  const products = await hydrateProductsWithDetailSections(
    supabase,
    rowProducts.map((entry) => mapProductRow(entry.productRow))
  );
  const productById = new Map(products.map((product) => [product.id, product]));

  return rowProducts.flatMap(({ row }) => {
    const product = productById.get(row.product_id);
    if (!product) {
      return [];
    }

    return [
      {
        id: row.id,
        productId: row.product_id,
        sortOrder: row.sort_order,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
        product,
        nonVisibleReasons: getHomeCurationNonVisibleReasons(product)
      }
    ];
  });
}

async function getNextHomeCurationSortOrder(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("home_curation_products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    throw new Error(`Could not load home curation sort order: ${error.message}`);
  }

  const row = data as { sort_order?: number } | null;
  return (row?.sort_order ?? 0) + 1;
}

async function normalizeHomeCurationOrder(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("normalize_home_curation_order");

  if (error) {
    if (isMissingHomeCurationTableError(error)) {
      throw new HomeCurationSetupRequiredError();
    }

    throw new Error(`Could not normalize home curation order: ${error.message}`);
  }

  return hydrateHomeCurationEntryRows(supabase, (data ?? []) as HomeCurationEntryRow[]);
}

export function isMissingHomeCurationTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "PGRST205" ||
    /Could not find the table ['"]public\.home_curation_products['"] in the schema cache/i.test(
      candidate.message ?? ""
    )
  );
}

function isDuplicateHomeCurationProductError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const haystack = `${candidate.message ?? ""} ${candidate.details ?? ""}`;
  return (
    candidate.code === "23505" &&
    /home_curation_products.*product_id|product_id.*home_curation_products/i.test(haystack)
  );
}

function assertValidCurationIdList(ids: string[]) {
  if (!Array.isArray(ids)) {
    throw new HomeCurationOrderError("Curation ids must be an array");
  }

  if (new Set(ids).size !== ids.length) {
    throw new HomeCurationOrderError("Curation reorder payload contains duplicates");
  }

  if (ids.some((id) => typeof id !== "string" || !id.trim())) {
    throw new HomeCurationOrderError("Curation reorder payload contains invalid ids");
  }
}

function sameIdSet(nextIds: string[], currentIds: string[]) {
  if (nextIds.length !== currentIds.length) {
    return false;
  }

  const current = new Set(currentIds);
  return nextIds.every((id) => current.has(id));
}

function getRelationObject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}
