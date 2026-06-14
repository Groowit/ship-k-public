import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HomeCurationDuplicateProductError,
  HomeCurationOrderError,
  HomeCurationSetupRequiredError,
  createHomeCurationEntry,
  deleteHomeCurationEntry,
  getHomeCurationNonVisibleReasons,
  listAdminHomeCurationEntries,
  listHomeCurationProducts,
  reorderHomeCurationEntries
} from "./home-curation";
import { createSupabasePrivilegedClient } from "./supabase/admin";
import { createSupabaseServerClient } from "./supabase/server";
import type { ProductRow } from "./commerce-store";
import type { Product } from "./products";

vi.mock("./supabase/admin", () => ({
  createSupabasePrivilegedClient: vi.fn()
}));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("./commerce-store", async () => {
  const actual = await vi.importActual<typeof import("./commerce-store")>("./commerce-store");
  return {
    ...actual,
    hydrateProductsWithDetailSections: vi.fn(async (_supabase, products: Product[]) => products)
  };
});

describe("home curation store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public home products in admin order while filtering non-visible entries and capping at 12", async () => {
    const rows = [
      curationRow("entry_draft", productRow({ id: "draft", slug: "draft", status: "draft" }), 1),
      ...Array.from({ length: 13 }, (_, index) =>
        curationRow(
          `entry_${index}`,
          productRow({
            id: `product_${index}`,
            slug: `product-${index}`,
            name: `Product ${index}`,
            stockQuantity: index === 3 ? 0 : 10
          }),
          index + 2
        )
      ),
      curationRow("entry_archived", productRow({ id: "archived", slug: "archived", status: "archived" }), 20)
    ];
    vi.mocked(createSupabaseServerClient).mockResolvedValue(listClient(rows) as never);

    const products = await listHomeCurationProducts();

    expect(products).toHaveLength(12);
    expect(products.map((product) => product.slug)).toEqual([
      "product-0",
      "product-1",
      "product-2",
      "product-4",
      "product-5",
      "product-6",
      "product-7",
      "product-8",
      "product-9",
      "product-10",
      "product-11",
      "product-12"
    ]);
  });

  it("keeps draft, archived, and out-of-stock entries in the admin list with reasons", async () => {
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      listClient([
        curationRow("entry_draft", productRow({ id: "draft", slug: "draft", status: "draft" }), 1),
        curationRow("entry_archived", productRow({ id: "archived", slug: "archived", status: "archived" }), 2),
        curationRow("entry_oos", productRow({ id: "oos", slug: "oos", stockQuantity: 0 }), 3)
      ]) as never
    );

    const entries = await listAdminHomeCurationEntries();

    expect(entries.map((entry) => entry.nonVisibleReasons)).toEqual([
      ["draft"],
      ["archived"],
      ["out_of_stock"]
    ]);
  });

  it("returns an empty public list when the migration is missing", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      listClient([], missingTableError()) as never
    );

    await expect(listHomeCurationProducts()).resolves.toEqual([]);
  });

  it("surfaces missing table as setup-required for admin reads", async () => {
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      listClient([], missingTableError()) as never
    );

    await expect(listAdminHomeCurationEntries()).rejects.toThrow(HomeCurationSetupRequiredError);
  });

  it("creates a curation entry at the next sort order and returns the refreshed list", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: "entry_2", product_id: "product_2", sort_order: 2 },
          error: null
        })
      }))
    }));
    const from = vi
      .fn()
      .mockReturnValueOnce(sortOrderClient(1))
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce(listClient([curationRow("entry_2", productRow({ id: "product_2", slug: "product-2" }), 2)]).from("home_curation_products"));
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({ from } as never);

    const entries = await createHomeCurationEntry({ productId: "product_2" });

    expect(insert).toHaveBeenCalledWith({ product_id: "product_2", sort_order: 2 });
    expect(entries[0]?.productId).toBe("product_2");
  });

  it("maps unique product conflicts to a duplicate-product error", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint \"home_curation_products_product_id_key\""
          }
        })
      }))
    }));
    const from = vi.fn().mockReturnValueOnce(sortOrderClient(1)).mockReturnValueOnce({ insert });
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({ from } as never);

    await expect(createHomeCurationEntry({ productId: "product_1" })).rejects.toThrow(
      HomeCurationDuplicateProductError
    );
  });

  it("deletes an entry and normalizes remaining order", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({
      from: vi.fn(() => ({ delete: vi.fn(() => ({ eq })) })),
      rpc
    } as never);

    await expect(deleteHomeCurationEntry("entry_1")).resolves.toEqual([]);
    expect(rpc).toHaveBeenCalledWith("normalize_home_curation_order");
  });

  it("rejects duplicate reorder ids before touching the database", async () => {
    await expect(reorderHomeCurationEntries(["entry_1", "entry_1"])).rejects.toThrow(
      HomeCurationOrderError
    );
    expect(createSupabasePrivilegedClient).not.toHaveBeenCalled();
  });

  it("rejects incomplete and unknown reorder payloads", async () => {
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue(
      listClient([
        curationRow("entry_1", productRow({ id: "product_1", slug: "product-1" }), 1),
        curationRow("entry_2", productRow({ id: "product_2", slug: "product-2" }), 2)
      ]) as never
    );

    await expect(reorderHomeCurationEntries(["entry_1"])).rejects.toThrow(/every entry/);
    await expect(reorderHomeCurationEntries(["entry_1", "entry_unknown"])).rejects.toThrow(
      /every entry/
    );
  });

  it("persists a complete reorder through the RPC", async () => {
    const client = listClient([
      curationRow("entry_1", productRow({ id: "product_1", slug: "product-1" }), 1),
      curationRow("entry_2", productRow({ id: "product_2", slug: "product-2" }), 2)
    ]);
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: "entry_2", product_id: "product_2", sort_order: 1, created_at: null, updated_at: null },
        { id: "entry_1", product_id: "product_1", sort_order: 2, created_at: null, updated_at: null }
      ],
      error: null
    });
    const from = vi
      .fn()
      .mockReturnValueOnce(client.from("home_curation_products"))
      .mockReturnValueOnce(
        listClient([
          curationRow("entry_2", productRow({ id: "product_2", slug: "product-2" }), 1),
          curationRow("entry_1", productRow({ id: "product_1", slug: "product-1" }), 2)
        ]).from("home_curation_products")
      );
    vi.mocked(createSupabasePrivilegedClient).mockReturnValue({ from, rpc } as never);

    const entries = await reorderHomeCurationEntries(["entry_2", "entry_1"]);

    expect(rpc).toHaveBeenCalledWith("reorder_home_curation_products", {
      p_entry_ids: ["entry_2", "entry_1"]
    });
    expect(entries.map((entry) => entry.id)).toEqual(["entry_2", "entry_1"]);
  });

  it("derives non-visible reasons from product lifecycle and stock", () => {
    expect(getHomeCurationNonVisibleReasons(productFixture({ status: "draft" }))).toEqual(["draft"]);
    expect(getHomeCurationNonVisibleReasons(productFixture({ status: "archived" }))).toEqual(["archived"]);
    expect(getHomeCurationNonVisibleReasons(productFixture({ stockQuantity: 0 }))).toEqual(["out_of_stock"]);
    expect(getHomeCurationNonVisibleReasons(productFixture())).toEqual([]);
  });
});

function listClient(rows: unknown[], error: unknown = null) {
  const secondOrder = vi.fn().mockResolvedValue({ data: rows, error });
  const firstOrder = vi.fn(() => ({ order: secondOrder }));
  const inFilter = vi.fn(() => ({ order: firstOrder }));
  const select = vi.fn(() => ({ order: firstOrder, in: inFilter }));
  return {
    from: vi.fn((table?: string) => {
      void table;
      return { select };
    })
  };
}

function sortOrderClient(sortOrder: number) {
  return {
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { sort_order: sortOrder }, error: null })
        }))
      }))
    }))
  };
}

function curationRow(id: string, product: ProductRow, sortOrder: number) {
  return {
    id,
    product_id: product.id,
    sort_order: sortOrder,
    created_at: `2026-06-14T00:00:${String(sortOrder).padStart(2, "0")}.000Z`,
    updated_at: null,
    products: product
  };
}

function productRow(overrides: Partial<ProductRow> & { stockQuantity?: number } = {}): ProductRow {
  const id = overrides.id ?? "product_1";
  const slug = overrides.slug ?? id;

  return {
    id,
    brand_name: overrides.brand_name ?? "Glow Brand",
    name: overrides.name ?? slug,
    slug,
    short_description: overrides.short_description ?? "Short copy",
    description: overrides.description ?? "Long copy",
    hero_image_path: overrides.hero_image_path ?? "/hero.png",
    status: overrides.status ?? "active",
    badges: overrides.badges ?? [],
    tags: overrides.tags ?? ["GLOW"],
    product_type: overrides.product_type ?? "single",
    difficulty: overrides.difficulty ?? "Beginner",
    item_count: overrides.item_count ?? null,
    intro_video_url: overrides.intro_video_url ?? null,
    best_for: overrides.best_for ?? null,
    result: overrides.result ?? null,
    created_at: overrides.created_at ?? "2026-06-14T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-06-14T00:00:00.000Z",
    categories: overrides.categories ?? { name: "Skincare" },
    product_options: overrides.product_options ?? [
      {
        id: `${id}_option`,
        name: "Default option",
        sku: `${id.toUpperCase()}-SKU`,
        price_cents: 4900,
        stock_quantity: overrides.stockQuantity ?? 10
      }
    ],
    product_images: overrides.product_images ?? [],
    product_included_items: overrides.product_included_items ?? [],
    product_routine_steps: overrides.product_routine_steps ?? [],
    product_content_blocks: overrides.product_content_blocks ?? [],
    product_detail_sections: overrides.product_detail_sections ?? []
  };
}

function productFixture(overrides: Partial<Product> & { stockQuantity?: number } = {}): Product {
  return {
    id: "product_1",
    slug: "product-1",
    productType: "single",
    brandName: "Glow Brand",
    name: "Product 1",
    category: "Skincare",
    difficulty: "Beginner",
    shortDescription: "Short copy",
    description: "Long copy",
    heroImagePath: "/hero.png",
    badges: [],
    tags: ["GLOW"],
    status: overrides.status ?? "active",
    option: {
      id: "option_1",
      name: "Default option",
      sku: "SKU-1",
      priceCents: 4900,
      stockQuantity: overrides.stockQuantity ?? overrides.option?.stockQuantity ?? 10
    },
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: [],
    detailSections: [],
    ...overrides
  };
}

function missingTableError() {
  return {
    code: "PGRST205",
    message: "Could not find the table 'public.home_curation_products' in the schema cache"
  };
}
