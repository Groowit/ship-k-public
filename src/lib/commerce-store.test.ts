import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindCheckoutSessionPayment,
  createPaidOrder,
  deleteProduct,
  createSecureRandomToken,
  findCheckoutSessionForCapture,
  findProductBySlug,
  getOrderByUser,
  listActiveProducts,
  listAdminCommissionSettlements,
  getCommissionStatusActions,
  getCommissionStatusUpdateValues,
  getTrackingUrl,
  isPromoterSchemaMissingError,
  mapOrderRow,
  mapProductRow,
  payUnpaidAffiliateCommissions,
  updateCustomerAccount,
  updateProduct,
  updateCommissionStatus,
  updateAffiliateStatus,
  updateOrderFulfillment,
  PaymentReferenceConflictError
} from "./commerce-store";
import type { Product } from "./products";

const mocks = vi.hoisted(() => ({
  privilegedClient: undefined as unknown,
  serverClient: undefined as unknown
}));

vi.mock("./supabase/admin", () => ({
  createSupabasePrivilegedClient: () => mocks.privilegedClient
}));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: () => mocks.serverClient
}));

beforeEach(() => {
  mocks.privilegedClient = undefined;
  mocks.serverClient = undefined;
});

describe("Supabase order mapping", () => {
  it("maps nested order rows to the commerce order shape", () => {
    const row = {
      id: "order_1",
      user_id: "user_1",
      order_number: "SK123456",
      status: "paid",
      currency: "USD",
      subtotal_cents: 4900,
      shipping_cents: 999,
      total_cents: 5899,
      referral_code: "creator_code",
      created_at: "2026-05-19T00:00:00.000Z",
      order_items: [
        {
          product_name: "Skincare Starter Set",
          option_name: "5-item set",
          quantity: 1,
          product_id: "product_1",
          products: { slug: "skincare-starter-set" }
        }
      ],
      shipping_addresses: [
        {
          name: "Jamie Park",
          email: "jamie@example.com",
          phone: "2135550144",
          address1: "123 Ocean Ave",
          address2: null,
          city: "Los Angeles",
          state: "CA",
          postal_code: "90001",
          country: "US",
          memo: null
        }
      ],
      shipments: [{ carrier: "USPS", tracking_number: "TRACK123" }],
      payment_transactions: [{ provider_order_id: "paypal_1" }]
    } satisfies Parameters<typeof mapOrderRow>[0];

    expect(mapOrderRow(row)).toMatchObject({
      id: "order_1",
      userId: "user_1",
      productSlug: "skincare-starter-set",
      productName: "Skincare Starter Set",
      paymentProviderOrderId: "paypal_1",
      referralCode: "creator_code",
      shipmentCarrier: "USPS",
      shippingAddress: {
        email: "jamie@example.com",
        postalCode: "90001"
      },
      trackingNumber: "TRACK123"
    });
  });
});

describe("Supabase product mapping", () => {
  it("finds canonical product rows from legacy referral destination slugs", async () => {
    mocks.serverClient = createSupabaseMock((call) => {
      if (call.table === "products" && call.terminal === "then") {
        const slugFilter = call.filters.find((filter) => filter.column === "slug");
        const slugs = Array.isArray(slugFilter?.value) ? slugFilter.value : [];

        if (!slugs.includes("gloss-makeup-set")) {
          return { data: [], error: null };
        }

        return {
          data: [
            {
              id: "product_gloss",
              brand_name: "shipK Curated",
              name: "Gloss Makeup Set",
              slug: "gloss-makeup-set",
              short_description: "Glossy makeup set.",
              description: "A glossy makeup set.",
              hero_image_path: "/hero.png",
              status: "active",
              badges: [],
              tags: ["GLOSS", "MAKEUP", "6 ITEMS"],
              product_type: "set",
              difficulty: "Beginner",
              item_count: 6,
              intro_video_url: null,
              best_for: null,
              result: null,
              created_at: "2026-05-18T00:00:00.000Z",
              updated_at: "2026-05-19T00:00:00.000Z",
              categories: { name: "Makeup" },
              product_options: [
                {
                  id: "option_gloss",
                  name: "6-item set",
                  sku: "GLOSS-SET",
                  price_cents: 5900,
                  stock_quantity: 10
                }
              ],
              product_images: [],
              product_included_items: [],
              product_routine_steps: [],
              product_content_blocks: [],
              product_detail_sections: []
            } satisfies Parameters<typeof mapProductRow>[0]
          ],
          error: null
        };
      }

      if (call.table === "product_detail_sections") {
        return { data: [], error: null };
      }

      return { data: [], error: null };
    });

    const product = await findProductBySlug("y2k-cute-bomb");

    expect(product?.slug).toBe("gloss-makeup-set");
    expect(product?.name).toBe("Gloss Makeup Set");
  });

  it("prefers the active canonical product row when legacy and canonical rows both exist", async () => {
    mocks.serverClient = createSupabaseMock((call) => {
      if (call.table === "products" && call.terminal === "then") {
        return {
          data: [
            productRowFixture({
              id: "product_legacy",
              name: "Y2K Cute Bomb",
              slug: "y2k-cute-bomb",
              priceCents: 3900
            }),
            productRowFixture({
              id: "product_canonical",
              name: "Gloss Makeup Set",
              slug: "gloss-makeup-set",
              priceCents: 5900
            })
          ],
          error: null
        };
      }

      if (call.table === "product_detail_sections") {
        return { data: [], error: null };
      }

      return { data: [], error: null };
    });

    const product = await findProductBySlug("y2k-cute-bomb");

    expect(product?.id).toBe("product_canonical");
    expect(product?.slug).toBe("gloss-makeup-set");
    expect(product?.option.priceCents).toBe(5900);
  });

  it("keeps product loading compatible before disclosure note migrations are applied", async () => {
    mocks.serverClient = createSupabaseMock((call) => {
      if (call.table === "products" && call.terminal === "then") {
        const idFilter = call.filters.find((filter) => filter.column === "id");
        if (idFilter) {
          return {
            data: null,
            error: {
              code: "42703",
              message: "column products.disclosure_notes does not exist"
            }
          };
        }

        return {
          data: [
            productRowFixture({
              id: "product_1",
              name: "Skincare Starter Set",
              slug: "skincare-starter-set",
              priceCents: 4900
            })
          ],
          error: null
        };
      }

      if (call.table === "product_detail_sections") {
        return { data: [], error: null };
      }

      return { data: [], error: null };
    });

    const product = await findProductBySlug("skincare-starter-set");

    expect(product?.name).toBe("Skincare Starter Set");
    expect(product?.disclosureNotes).toBeUndefined();
  });

  it("decorates active products with positive 7-day sales metrics", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00.000Z"));

    mocks.serverClient = createSupabaseMock((call) => {
      if (call.table === "products" && call.terminal === "then") {
        return {
          data: [
            productRowFixture({
              id: "product_recent",
              name: "Recent Winner",
              slug: "recent-winner",
              priceCents: 4900
            }),
            productRowFixture({
              id: "product_cumulative",
              name: "Cumulative Winner",
              slug: "cumulative-winner",
              priceCents: 5900
            })
          ],
          error: null
        };
      }

      if (call.table === "product_detail_sections") {
        return { data: [], error: null };
      }

      return { data: [], error: null };
    });

    mocks.privilegedClient = createSupabaseMock((call) => {
      if (call.table === "products") {
        return {
          data: [
            { id: "product_recent", created_at: "2026-05-18T00:00:00.000Z" },
            { id: "product_cumulative", created_at: "2026-05-19T00:00:00.000Z" }
          ],
          error: null
        };
      }

      if (call.table === "order_items") {
        return {
          data: [
            {
              product_id: "product_recent",
              quantity: 2,
              orders: { status: "delivered", created_at: "2026-06-13T00:00:00.000Z" }
            },
            {
              product_id: "product_recent",
              quantity: 3,
              orders: { status: "paid", created_at: "2026-06-08T12:00:00.000Z" }
            },
            {
              product_id: "product_recent",
              quantity: 11,
              orders: { status: "paid", created_at: "2026-06-01T00:00:00.000Z" }
            },
            {
              product_id: "product_recent",
              quantity: 7,
              orders: { status: "cancelled", created_at: "2026-06-14T00:00:00.000Z" }
            },
            {
              product_id: "product_cumulative",
              quantity: 8,
              orders: { status: "shipped", created_at: "2026-05-20T00:00:00.000Z" }
            }
          ],
          error: null
        };
      }

      return { data: [], error: null };
    });

    try {
      const products = await listActiveProducts();
      const recentWinner = products.find((product) => product.id === "product_recent");
      const cumulativeWinner = products.find((product) => product.id === "product_cumulative");

      expect(recentWinner?.salesCount).toBe(16);
      expect(recentWinner?.recentSalesCount).toBe(5);
      expect(cumulativeWinner?.salesCount).toBe(8);
      expect(cumulativeWinner?.recentSalesCount).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps gallery images and structured detail rows in sort order", () => {
    const row = {
      id: "product_1",
      brand_name: "shipK Curated",
      name: "Skincare Starter Set",
      slug: "skincare-starter-set",
      short_description: "Short",
      description: "Description",
      hero_image_path: "/hero.png",
      status: "active",
      badges: ["BEST"],
      tags: ["STARTER", "SKINCARE", "5 ITEMS"],
      product_type: "set",
      difficulty: "Beginner",
      item_count: 5,
      intro_video_url: null,
      best_for: "Daily routines",
      result: "Glow",
      disclosure_notes: {
        curatorsNote: {
          selectionReason: "Selected for the routine.",
          bestFor: "Daily cleansing.",
          moodFinish: "Fresh finish."
        },
        formulaBreakdown: {
          keyIngredients: "Rice extract.",
          ingredientRole: "Softens the cleanse.",
          textureFormulaNote: "Cream-to-foam texture."
        },
        careCautions: {
          skinUseCautions: "Patch test first.",
          storageNotes: "Store cool.",
          regulatoryNote: "Read the package label."
        },
        beforeYouBuy: {
          shippingNote: "Ships with tracking.",
          customsFees: "Customs may apply.",
          returnsNote: "Unopened returns only."
        }
      },
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-19T00:00:00.000Z",
      categories: { name: "Skincare" },
      product_options: [
        {
          id: "option_1",
          name: "5-item set",
          sku: "SK-DAILY",
          price_cents: 4900,
          stock_quantity: 10
        }
      ],
      product_images: [
        {
          id: "gallery_2",
          sort_order: 2,
          image_path: "/gallery-2.png",
          alt_text: "Second"
        },
        {
          id: "gallery_1",
          sort_order: 1,
          image_path: "/gallery-1.png",
          alt_text: "First"
        }
      ],
      product_included_items: [
        {
          id: "item_1",
          sort_order: 1,
          name: "Cleanser",
          category: "Cleanser",
          description: "Soft cleanse"
        }
      ],
      product_routine_steps: [
        {
          id: "step_1",
          sort_order: 1,
          title: "Cleanse",
          body: "Start clean"
        }
      ],
      product_content_blocks: [
        {
          id: "block_1",
          type: "text",
          sort_order: 1,
          title: "Story",
          eyebrow: "Routine",
          body: "Body",
          image_path: null,
          image_alt: null,
          image_position: null
        }
      ]
    } satisfies Parameters<typeof mapProductRow>[0];

    const product = mapProductRow(row);

    expect(product.galleryImages.map((image) => image.altText)).toEqual([
      "First",
      "Second"
    ]);
    expect(product.createdAt).toBe("2026-05-18T00:00:00.000Z");
    expect(product.updatedAt).toBe("2026-05-19T00:00:00.000Z");
    expect(product.badges).toEqual([]);
    expect(product.tags).toEqual(["STARTER", "SKINCARE", "5 ITEMS"]);
    expect(product.disclosureNotes?.curatorsNote.selectionReason).toBe("Selected for the routine.");
    expect(product.disclosureNotes?.beforeYouBuy.customsFees).toBe("Customs may apply.");
    expect(product.contentBlocks[0]).toMatchObject({
      type: "text",
      title: "Story"
    });
  });

  it("normalizes legacy launch catalog data from Supabase rows", () => {
    const row = {
      id: "product_1",
      brand_name: "shipK Curated",
      name: "K-Pop Idol Look",
      slug: "k-pop-idol-look",
      short_description: "A stage-inspired makeup kit.",
      description: "A fictional color routine for Creator demos.",
      hero_image_path: "/demo-assets/sets/k-pop-idol-look.png",
      status: "active",
      badges: ["NEW"],
      tags: ["MAKEUP", "STARTER", "7 ITEMS"],
      product_type: "curated_set",
      difficulty: "Intermediate",
      item_count: 7,
      intro_video_url: null,
      best_for: "Creator demos and easy creator demonstrations.",
      result: "Bright eyes",
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-19T00:00:00.000Z",
      categories: { name: "Makeup" },
      product_options: [],
      product_images: [
        {
          id: "gallery_1",
          sort_order: 1,
          image_path: "/demo-assets/sets/k-pop-idol-look.png",
          alt_text: "Idol look"
        }
      ],
      product_included_items: [
        {
          id: "item_1",
          sort_order: 1,
          name: "Primer",
          category: "Base",
          description: "A fictional base-prep item."
        }
      ],
      product_routine_steps: [],
      product_content_blocks: [
        {
          id: "block_1",
          type: "image_text",
          sort_order: 1,
          title: "Creator demos",
          eyebrow: "MVP",
          body: "A fictional tutorial block for creator demonstrations.",
          image_path: "/demo-assets/sets/k-pop-idol-look.png",
          image_alt: null,
          image_position: "left"
        }
      ]
    } satisfies Parameters<typeof mapProductRow>[0];

    const product = mapProductRow(row);

    expect(product.heroImagePath).toBe("/catalog-assets/sets/k-pop-idol-look.png");
    expect(product.galleryImages[0]?.imagePath).toBe("/catalog-assets/sets/k-pop-idol-look.png");
    expect(product.description).toBe("A color set for Creator tutorials.");
    expect(product.bestFor).toBe("Creator tutorials and easy creator tutorials.");
    expect(product.badges).toEqual([]);
    expect(product.tags).toEqual(["MAKEUP", "STARTER", "7 ITEMS"]);
    expect(product.includedItems[0]?.description).toBe("A base-prep item.");
    expect(product.contentBlocks[0]).toMatchObject({
      eyebrow: "Phase 1 launch",
      title: "Creator tutorials",
      body: "A tutorial block for creator tutorials.",
      imagePath: "/catalog-assets/sets/k-pop-idol-look.png"
    });
  });

  it("normalizes public storage launch asset URLs to bundled catalog assets", () => {
    const row = {
      id: "product_single",
      brand_name: "Peach Hour",
      name: "Peach Cloud Cream Blush",
      slug: "peach-cloud-cream-blush",
      short_description: "A peach cream blush.",
      description: "A peach cream blush for soft color.",
      hero_image_path:
        "https://example.supabase.co/storage/v1/object/public/product-images/single-products/peach-cloud-cream-blush.png",
      status: "active",
      badges: [],
      tags: ["BLUSH"],
      product_type: "single",
      difficulty: null,
      item_count: null,
      intro_video_url: null,
      best_for: null,
      result: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-19T00:00:00.000Z",
      categories: { name: "Makeup" },
      product_options: [],
      product_images: [
        {
          id: "gallery_1",
          sort_order: 1,
          image_path:
            "https://example.supabase.co/storage/v1/object/public/product-images/detail/y2k-cute-bomb-lifestyle.png",
          alt_text: "Gloss makeup lifestyle"
        },
        {
          id: "gallery_2",
          sort_order: 2,
          image_path:
            "https://example.supabase.co/storage/v1/object/public/product-images/detail/glass-skin-starter-lifestyle.png",
          alt_text: "Glass skin lifestyle"
        },
        {
          id: "gallery_3",
          sort_order: 3,
          image_path:
            "https://example.supabase.co/storage/v1/object/public/product-images/detail/warm-honey-look-lifestyle.png",
          alt_text: "Warm honey lifestyle"
        },
        {
          id: "gallery_4",
          sort_order: 4,
          image_path:
            "https://example.supabase.co/storage/v1/object/public/product-images/detail/daily-k-glow-set-lifestyle.png",
          alt_text: "Daily glow lifestyle"
        },
        {
          id: "gallery_5",
          sort_order: 5,
          image_path:
            "https://example.supabase.co/storage/v1/object/public/product-images/detail/bubble-tide-seafoam-splash-hydration-set-lifestyle.png",
          alt_text: "Bubble Tide lifestyle"
        }
      ],
      product_included_items: [],
      product_routine_steps: [],
      product_content_blocks: []
    } satisfies Parameters<typeof mapProductRow>[0];

    const product = mapProductRow(row);

    expect(product.heroImagePath).toBe("/catalog-assets/singles/peach-cloud-cream-blush.png");
    expect(product.galleryImages.map((image) => image.imagePath)).toEqual([
      "/catalog-assets/detail/y2k-cute-lifestyle.png",
      "/catalog-assets/detail/glass-skin-lifestyle.png",
      "/catalog-assets/detail/warm-honey-lifestyle.png",
      "/catalog-assets/detail/daily-k-glow-lifestyle.png",
      "/catalog-assets/detail/bubble-tide-lifestyle.png"
    ]);
  });

  it("keeps malformed storage URL paths from crashing product mapping", () => {
    const row = {
      id: "product_bad_asset",
      brand_name: "Peach Hour",
      name: "Peach Cloud Cream Blush",
      slug: "peach-cloud-cream-blush",
      short_description: "A peach cream blush.",
      description: "A peach cream blush for soft color.",
      hero_image_path:
        "https://example.supabase.co/storage/v1/object/public/product-images/single-products/bad%zz.png",
      status: "active",
      badges: [],
      tags: ["BLUSH"],
      product_type: "single",
      difficulty: null,
      item_count: null,
      intro_video_url: null,
      best_for: null,
      result: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-19T00:00:00.000Z",
      categories: { name: "Makeup" },
      product_options: [],
      product_images: [],
      product_included_items: [],
      product_routine_steps: [],
      product_content_blocks: []
    } satisfies Parameters<typeof mapProductRow>[0];

    expect(() => mapProductRow(row)).not.toThrow();
    expect(mapProductRow(row).heroImagePath).toBe(row.hero_image_path);
  });
});

describe("admin product persistence", () => {
  it("persists disclosure notes in product update mutations", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);

      if (call.table === "products" && call.terminal === "maybeSingle") {
        return {
          data: productRowFixture({
            id: "product_1",
            name: "Skincare Starter Set",
            slug: "skincare-starter-set",
            priceCents: 4900
          }),
          error: null
        };
      }

      if (call.table === "categories" && call.terminal === "maybeSingle") {
        return { data: { id: "category_1" }, error: null };
      }

      if (call.table === "products" && call.operation === "update") {
        return { error: null };
      }

      if (call.table === "product_options" && call.operation === "select") {
        return { data: [{ id: "option_1" }], error: null };
      }

      if (call.table === "product_options" && call.operation === "update") {
        return { error: null };
      }

      if (
        ["product_images", "product_included_items", "product_routine_steps", "product_content_blocks"].includes(
          call.table
        ) &&
        call.operation === "delete"
      ) {
        return { error: null };
      }

      if (call.table === "product_content_blocks" && call.operation === "insert") {
        return { error: null };
      }

      if (call.table === "product_detail_sections") {
        return { data: [], error: null };
      }

      if (call.table === "products" && call.terminal === "then") {
        return { data: [], error: null };
      }

      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateProduct("product_1", {
      productType: "set",
      brandName: "shipK Curated",
      name: "Skincare Starter Set",
      category: "Skincare",
      tags: ["SKINCARE"],
      difficulty: "Beginner",
      itemCount: 1,
      shortDescription: "Short",
      description: "Description",
      priceCents: 4900,
      stockQuantity: 10,
      heroImagePath: "/hero.png",
      galleryImages: [],
      includedItems: [],
      routineSteps: [],
      contentBlocks: [],
      disclosureNotes: completeDisclosureNotes(),
      detailSections: [],
      status: "active"
    });

    const productUpdate = calls.find((call) => call.table === "products" && call.operation === "update");
    expect(productUpdate?.values).toMatchObject({
      disclosure_notes: {
        curatorsNote: {
          selectionReason: "Selected for a refined daily routine."
        },
        beforeYouBuy: {
          returnsNote: "Unopened items follow the store return policy."
        }
      }
    });
  });

  it("does not create fallback legacy story blocks when canonical detail sections exist", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);

      if (call.table === "products" && call.terminal === "maybeSingle") {
        return {
          data: productRowFixture({
            id: "product_1",
            name: "Haedal Recovery Cream",
            slug: "haedal-recovery-cream",
            priceCents: 2400
          }),
          error: null
        };
      }

      if (call.table === "categories" && call.terminal === "maybeSingle") {
        return { data: { id: "category_1" }, error: null };
      }

      if (call.table === "products" && call.operation === "update") {
        return { error: null };
      }

      if (call.table === "product_options" && call.operation === "select") {
        return { data: [{ id: "option_1" }], error: null };
      }

      if (call.table === "product_options" && call.operation === "update") {
        return { error: null };
      }

      if (
        ["product_images", "product_included_items", "product_routine_steps", "product_content_blocks"].includes(
          call.table
        ) &&
        call.operation === "delete"
      ) {
        return { error: null };
      }

      if (call.table === "replace_product_detail_sections" && call.operation === "rpc") {
        return { error: null };
      }

      if (call.table === "product_detail_sections") {
        return { data: [], error: null };
      }

      if (call.table === "products" && call.terminal === "then") {
        return { data: [], error: null };
      }

      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateProduct("product_1", {
      productType: "single",
      brandName: "HAEDAL'S",
      name: "Haedal Recovery Cream",
      category: "Skincare",
      tags: ["SKINCARE"],
      shortDescription: "냥",
      description: "냐냥ㅇ",
      bestFor: "냐냥이",
      result: "뇽뇽ㅇ",
      priceCents: 2400,
      stockQuantity: 10,
      heroImagePath: "/hero.png",
      galleryImages: [],
      includedItems: [],
      routineSteps: [],
      contentBlocks: [],
      disclosureNotes: completeDisclosureNotes(),
      detailSections: [
        {
          sectionType: "heading",
          schemaVersion: 1,
          text: "제품 상세 스토리",
          level: "h2",
          align: "left"
        }
      ],
      detailActorId: "admin_1",
      status: "active"
    });

    expect(
      calls.some((call) => call.table === "product_content_blocks" && call.operation === "insert")
    ).toBe(false);
    expect(calls.some((call) => call.table === "replace_product_detail_sections" && call.operation === "rpc")).toBe(
      true
    );
  });
});

describe("admin product deletion", () => {
  it("hard deletes a product after detaching order history and checkout sessions", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);

      if (call.table === "order_items" && call.operation === "update") {
        return { error: null };
      }

      if (call.table === "checkout_sessions" && call.operation === "delete") {
        return { error: null };
      }

      if (call.table === "products" && call.operation === "delete") {
        return { error: null };
      }

      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await deleteProduct("product_1");

    expect(calls).toEqual([
      expect.objectContaining({
        table: "order_items",
        operation: "update",
        values: { product_id: null, product_option_id: null },
        filters: [{ column: "product_id", value: "product_1" }]
      }),
      expect.objectContaining({
        table: "checkout_sessions",
        operation: "delete",
        filters: [{ column: "product_id", value: "product_1" }]
      }),
      expect.objectContaining({
        table: "products",
        operation: "delete",
        filters: [{ column: "id", value: "product_1" }]
      })
    ]);
  });
});

describe("customer account updates", () => {
  it("updates customer profile and default shipping fields for the signed-in user", async () => {
    const calls: QueryCall[] = [];
    mocks.serverClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "profiles" && call.operation === "update") {
        return { error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateCustomerAccount({
      userId: "buyer_1",
      fullName: "Jamie Park",
      phone: "2135550144",
      marketingOptIn: true,
      defaultShippingAddress: {
        name: "Jamie Park",
        phone: "2135550144",
        address1: "123 Ocean Ave",
        address2: "Apt 4",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90001",
        country: "US",
        memo: "Leave near the front desk"
      }
    });

    const update = calls.find(
      (call) => call.table === "profiles" && call.operation === "update"
    );
    expect(update?.values).toMatchObject({
      full_name: "Jamie Park",
      phone: "2135550144",
      marketing_opt_in: true,
      default_shipping_name: "Jamie Park",
      default_shipping_phone: "2135550144",
      default_shipping_address1: "123 Ocean Ave",
      default_shipping_address2: "Apt 4",
      default_shipping_city: "Los Angeles",
      default_shipping_state: "CA",
      default_shipping_postal_code: "90001",
      default_shipping_country: "US",
      default_shipping_memo: "Leave near the front desk"
    });
    expect(update?.filters).toContainEqual({ column: "id", value: "buyer_1" });
  });
});

describe("customer order detail lookup", () => {
  it("loads an order by both order id and signed-in user id", async () => {
    const calls: QueryCall[] = [];
    mocks.serverClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return { data: orderRow("order_1", "PAYPAL-ORDER-1"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    const order = await getOrderByUser({ orderId: "order_1", userId: "buyer_1" });

    expect(order?.id).toBe("order_1");
    const lookup = calls.find((call) => call.table === "orders");
    expect(lookup?.filters).toEqual(
      expect.arrayContaining([
        { column: "id", value: "order_1" },
        { column: "user_id", value: "buyer_1" }
      ])
    );
  });
});

describe("carrier tracking links", () => {
  it("builds known carrier tracking URLs only when carrier and tracking number are present", () => {
    expect(getTrackingUrl("USPS", "9400110200881000000000")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400110200881000000000"
    );
    expect(getTrackingUrl("FedEx", "123456789012")).toBe(
      "https://www.fedex.com/fedextrack/?trknbr=123456789012"
    );
    expect(getTrackingUrl(null, "TRACK123")).toBeUndefined();
    expect(getTrackingUrl("Unknown Carrier", "TRACK123")).toBeUndefined();
  });
});

describe("order fulfillment updates", () => {
  it("saves carrier and tracking details and marks the order shipped", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "orders" && call.operation === "update") {
        return { error: null };
      }
      if (call.table === "shipments" && call.operation === "upsert") {
        return { error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return {
          data: orderRow("order_1", "PAYPAL-ORDER-1", "shipped", {
            carrier: "UPS",
            trackingNumber: "1Z999AA10123456784"
          }),
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    const order = await updateOrderFulfillment({
      orderId: "order_1",
      status: "preparing",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784"
    });

    const orderUpdate = calls.find(
      (call) => call.table === "orders" && call.operation === "update"
    );
    expect(orderUpdate?.values).toMatchObject({ status: "shipped" });
    const shipmentUpsert = calls.find(
      (call) => call.table === "shipments" && call.operation === "upsert"
    );
    expect(shipmentUpsert?.values).toMatchObject({
      order_id: "order_1",
      carrier: "UPS",
      tracking_number: "1Z999AA10123456784"
    });
    expect(order.status).toBe("shipped");
    expect(order.shipmentCarrier).toBe("UPS");
  });

  it("keeps an explicit delivered status when saving existing tracking details", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "orders" && call.operation === "update") {
        return { error: null };
      }
      if (call.table === "shipments" && call.operation === "upsert") {
        return { error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return {
          data: orderRow("order_1", "PAYPAL-ORDER-1", "delivered", {
            carrier: "DHL",
            trackingNumber: "JD014600006993715690"
          }),
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateOrderFulfillment({
      orderId: "order_1",
      status: "delivered",
      carrier: "DHL",
      trackingNumber: "JD014600006993715690"
    });

    const orderUpdate = calls.find(
      (call) => call.table === "orders" && call.operation === "update"
    );
    expect(orderUpdate?.values).toMatchObject({ status: "delivered" });
  });

  it("rejects backward or terminal order status transitions before updating", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return {
          data: orderRow("order_1", "PAYPAL-ORDER-1", "refunded"),
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      updateOrderFulfillment({
        orderId: "order_1",
        status: "shipped"
      })
    ).rejects.toThrow("Cannot transition order from refunded to shipped");

    expect(
      calls.some((call) => call.table === "orders" && call.operation === "update")
    ).toBe(false);
    expect(
      calls.some((call) => call.table === "shipments" && call.operation === "upsert")
    ).toBe(false);
  });
});

describe("commission status updates", () => {
  it("keeps approval and payment timestamps consistent with the target status", () => {
    const now = "2026-05-19T00:00:00.000Z";

    expect(getCommissionStatusUpdateValues("pending", now)).toEqual({
      status: "pending",
      approved_at: null,
      paid_at: null
    });
    expect(getCommissionStatusUpdateValues("approved", now)).toEqual({
      status: "approved",
      approved_at: now,
      paid_at: null
    });
    expect(getCommissionStatusUpdateValues("paid", now)).toEqual({
      status: "paid",
      approved_at: now,
      paid_at: now
    });
    expect(getCommissionStatusUpdateValues("cancelled", now)).toEqual({
      status: "cancelled",
      approved_at: null,
      paid_at: null
    });
  });

  it("describes manual monthly settlement actions for an unpaid commission", () => {
    expect(
      getCommissionStatusActions({
        currentStatus: "pending"
      })
    ).toEqual([
      expect.objectContaining({ status: "paid", disabledReason: undefined }),
      expect.objectContaining({ status: "cancelled", disabledReason: undefined })
    ]);
  });

  it("marks pending commissions as paid without a hold gate", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "commissions" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "commission_1",
            status: "pending"
          },
          error: null
        };
      }
      if (call.table === "commissions" && call.operation === "update") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateCommissionStatus({
      commissionId: "commission_1",
      status: "paid",
      now: "2026-06-01T00:00:00.000Z"
    });

    const update = calls.find((call) => call.table === "commissions" && call.operation === "update");
    expect(update?.values).toMatchObject({
      status: "paid",
      approved_at: "2026-06-01T00:00:00.000Z",
      paid_at: "2026-06-01T00:00:00.000Z"
    });
  });

  it("blocks hidden workflow statuses before updating", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "commissions" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "commission_1",
            status: "pending"
          },
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      updateCommissionStatus({
        commissionId: "commission_1",
        status: "approved",
        now: "2026-06-01T00:00:00.000Z"
      })
    ).rejects.toThrow("관리자 정산에서는 미정산 커미션을 지급 완료 또는 정산 제외만 처리할 수 있습니다.");
    expect(calls.some((call) => call.operation === "update")).toBe(false);
  });

  it("blocks terminal commission status changes before updating", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "commissions" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "commission_1",
            status: "paid"
          },
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      updateCommissionStatus({
        commissionId: "commission_1",
        status: "cancelled",
        now: "2026-06-01T00:00:00.000Z"
      })
    ).rejects.toThrow("지급 완료된 커미션은 상태를 변경할 수 없습니다.");
    expect(calls.some((call) => call.operation === "update")).toBe(false);
  });

  it("marks legacy approved commissions as paid", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "commissions" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "commission_1",
            status: "approved"
          },
          error: null
        };
      }
      if (call.table === "commissions" && call.operation === "update") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateCommissionStatus({
      commissionId: "commission_1",
      status: "paid",
      now: "2026-06-01T00:00:00.000Z"
    });

    const update = calls.find((call) => call.table === "commissions" && call.operation === "update");
    expect(update?.values).toMatchObject({
      status: "paid",
      approved_at: "2026-06-01T00:00:00.000Z",
      paid_at: "2026-06-01T00:00:00.000Z"
    });
  });

  it("marks every unpaid commission for one affiliate as paid in a single update", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "commissions" && call.operation === "update") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await payUnpaidAffiliateCommissions({
      affiliateId: "affiliate_1",
      now: "2026-06-01T00:00:00.000Z"
    });

    const update = calls.find((call) => call.table === "commissions" && call.operation === "update");
    expect(update?.values).toMatchObject({
      status: "paid",
      approved_at: "2026-06-01T00:00:00.000Z",
      paid_at: "2026-06-01T00:00:00.000Z"
    });
    expect(update?.filters).toEqual([
      { column: "affiliate_id", value: "affiliate_1" },
      { column: "status", value: ["pending", "approved"] }
    ]);
  });

  it("returns a typed not-found error before updating", async () => {
    mocks.privilegedClient = createSupabaseMock((call) => {
      if (call.table === "commissions" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      updateCommissionStatus({ commissionId: "missing", status: "paid" })
    ).rejects.toMatchObject({
      statusCode: 404
    });
  });
});

describe("admin commission settlement aggregation", () => {
  it("groups commission rows by promoter and derives settlement buckets", async () => {
    mocks.privilegedClient = createSupabaseMock((call) => {
      if (call.table === "commissions" && call.terminal === "then") {
        return {
          data: [
            commissionSettlementRow({
              id: "commission_pending",
              affiliateId: "affiliate_1",
              orderId: "order_1",
              orderNumber: "SK1001",
              amountCents: 420,
              baseCents: 4200,
              status: "pending",
              holdUntil: "2026-05-20T00:00:00.000Z"
            }),
            commissionSettlementRow({
              id: "commission_future",
              affiliateId: "affiliate_1",
              orderId: "order_2",
              orderNumber: "SK1002",
              amountCents: 500,
              baseCents: 5000,
              status: "pending",
              holdUntil: "2026-06-30T00:00:00.000Z"
            }),
            commissionSettlementRow({
              id: "commission_approved",
              affiliateId: "affiliate_1",
              orderId: "order_2",
              orderNumber: "SK1002",
              amountCents: 500,
              baseCents: 5000,
              status: "approved",
              holdUntil: "2026-05-20T00:00:00.000Z"
            }),
            commissionSettlementRow({
              id: "commission_cancelled",
              affiliateId: "affiliate_1",
              orderId: "order_3",
              orderNumber: "SK1003",
              amountCents: 600,
              baseCents: 6000,
              status: "cancelled",
              holdUntil: "2026-05-20T00:00:00.000Z"
            }),
            commissionSettlementRow({
              id: "commission_paid",
              affiliateId: "affiliate_2",
              orderId: "order_4",
              orderNumber: "SK1004",
              amountCents: 800,
              baseCents: 8000,
              status: "paid",
              holdUntil: "2026-05-20T00:00:00.000Z",
              affiliateCode: "sunny_code",
              displayName: "Sunny Beauty",
              email: null
            })
          ],
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    const settlements = await listAdminCommissionSettlements();

    expect(settlements).toHaveLength(2);
    expect(settlements[0]).toMatchObject({
      affiliateId: "affiliate_1",
      code: "creator_code",
      displayName: "Creator Kim",
      email: "creator@example.com",
      commissionCount: 4,
      orders: 3,
      salesBaseCents: 14_200,
      totalCommissionCents: 1_420,
      unpaidCommissionCents: 1_420,
      paidCommissionCents: 0,
      cancelledCommissionCents: 600
    });
    expect(settlements[0].commissions[0]).toMatchObject({
      id: "commission_pending",
      orderNumber: "SK1001",
      productName: "Glow Set",
      linkToken: "link_1"
    });
    expect(settlements[1]).toMatchObject({
      affiliateId: "affiliate_2",
      displayName: "Sunny Beauty",
      email: null,
      paidCommissionCents: 800
    });
  });

  it("falls back gracefully when joined promoter context is missing", async () => {
    mocks.privilegedClient = createSupabaseMock((call) => {
      if (call.table === "commissions" && call.terminal === "then") {
        return {
          data: [
            {
              id: "commission_missing",
              affiliate_id: null,
              affiliate_link_id: null,
              order_id: "order_missing",
              base_cents: 1_000,
              rate_bps: 1_000,
              amount_cents: 100,
              status: "pending",
              hold_until: "not-a-date",
              created_at: "2026-05-20T00:00:00.000Z",
              orders: { referral_code: "legacy_code", order_items: [] },
              affiliate_links: null,
              affiliates: null
            }
          ],
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    const settlements = await listAdminCommissionSettlements();

    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toMatchObject({
      affiliateId: "missing:legacy_code",
      code: "legacy_code",
      displayName: "legacy_code",
      status: "unknown",
      unpaidCommissionCents: 100
    });
    expect(settlements[0].commissions[0]).toMatchObject({
      orderNumber: "order_missing",
      productName: "Promoted order"
    });
  });

  it("returns an empty settlement list when promoter schema is missing", async () => {
    mocks.privilegedClient = createSupabaseMock((call) => {
      if (call.table === "commissions" && call.terminal === "then") {
        return {
          data: null,
          error: {
            code: "PGRST205",
            message: "Could not find public.affiliate_links in the schema cache"
          }
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(listAdminCommissionSettlements()).resolves.toEqual([]);
  });
});

describe("paid order payment idempotency", () => {
  it("returns the existing order when a PayPal capture was already persisted", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: { order_id: "order_existing" }, error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return { data: orderRow("order_existing", "PAYPAL-ORDER-1"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    const order = await createPaidOrder({
      userId: "buyer_1",
      product: productFixture(),
      quantity: 1,
      shippingAddress: shippingAddressFixture(),
      paymentProviderOrderId: "PAYPAL-ORDER-1",
      paymentProviderCaptureId: "CAPTURE-1",
      paymentPayload: {}
    });

    expect(order.id).toBe("order_existing");
    expect(calls.some((call) => call.table === "orders" && call.operation === "insert")).toBe(false);
  });

  it("rejects duplicate PayPal references that belong to another user", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: { order_id: "order_existing" }, error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return {
          data: {
            ...orderRow("order_existing", "PAYPAL-ORDER-1"),
            user_id: "other_buyer"
          },
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      createPaidOrder({
        userId: "buyer_1",
        product: productFixture(),
        quantity: 1,
        shippingAddress: shippingAddressFixture(),
        paymentProviderOrderId: "PAYPAL-ORDER-1",
        paymentProviderCaptureId: "CAPTURE-1",
        paymentPayload: {}
      })
    ).rejects.toThrow(/payment reference/i);

    expect(calls.some((call) => call.table === "orders" && call.operation === "insert")).toBe(false);
  });

  it("preserves payment reference conflicts discovered during concurrent inserts", async () => {
    const calls: QueryCall[] = [];
    let providerOrderLookups = 0;
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        const filters = Object.fromEntries(
          call.filters.map((filter) => [filter.column, filter.value])
        );
        if (filters.provider_capture_id === "CAPTURE-1") {
          return { data: null, error: null };
        }
        if (filters.provider_order_id === "PAYPAL-ORDER-1") {
          providerOrderLookups += 1;
          return providerOrderLookups === 1
            ? { data: null, error: null }
            : { data: { order_id: "order_existing" }, error: null };
        }
      }
      if (call.table === "orders" && call.terminal === "single" && call.values) {
        return { data: { id: "order_new" }, error: null };
      }
      if (call.table === "order_items" && call.operation === "insert") {
        return { error: null };
      }
      if (call.table === "shipping_addresses" && call.operation === "insert") {
        return { error: null };
      }
      if (call.table === "payment_transactions" && call.operation === "insert") {
        return {
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint"
          }
        };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return {
          data: {
            ...orderRow("order_existing", "PAYPAL-ORDER-1"),
            user_id: "other_buyer"
          },
          error: null
        };
      }
      if (call.table === "orders" && call.operation === "delete") {
        return { error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      createPaidOrder({
        userId: "buyer_1",
        product: productFixture(),
        quantity: 1,
        shippingAddress: shippingAddressFixture(),
        paymentProviderOrderId: "PAYPAL-ORDER-1",
        paymentProviderCaptureId: "CAPTURE-1",
        paymentPayload: {}
      })
    ).rejects.toBeInstanceOf(PaymentReferenceConflictError);

    expect(calls.filter((call) => call.table === "orders" && call.operation === "delete")).toHaveLength(1);
  });

  it("rolls back a new order when child order item insertion fails", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      if (call.table === "orders" && call.terminal === "single" && call.values) {
        return { data: { id: "order_new" }, error: null };
      }
      if (call.table === "order_items" && call.operation === "insert") {
        return { error: { message: "order item insert failed" } };
      }
      if (call.table === "orders" && call.operation === "delete") {
        return { error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      createPaidOrder({
        userId: "buyer_1",
        product: productFixture(),
        quantity: 1,
        shippingAddress: shippingAddressFixture(),
        paymentProviderOrderId: "PAYPAL-ORDER-1",
        paymentProviderCaptureId: "CAPTURE-1",
        paymentPayload: {}
      })
    ).rejects.toThrow("order item insert failed");

    expect(calls).toContainEqual(
      expect.objectContaining({
        table: "orders",
        operation: "delete",
        filters: [{ column: "id", value: "order_new" }]
      })
    );
    expect(
      calls.some((call) => call.table === "shipping_addresses" && call.operation === "insert")
    ).toBe(false);
    expect(
      calls.some((call) => call.table === "payment_transactions" && call.operation === "insert")
    ).toBe(false);
  });
});

describe("paid order referral attribution", () => {
  it("attributes commission to the purchased product link inside an active referral window", async () => {
    const calls: QueryCall[] = [];
    const purchasedProduct = {
      ...productFixture(),
      id: "product_2",
      name: "Hydration Skincare Set",
      slug: "hydration-skincare-set"
    };
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      if (call.table === "affiliates" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "affiliate_1",
            profile_id: "promoter_1",
            code: "creator_code",
            status: "active",
            profiles: { email: "creator@example.com", phone: "2135550000" }
          },
          error: null
        };
      }
      if (call.table === "affiliate_links" && call.terminal === "maybeSingle") {
        const filters = Object.fromEntries(
          call.filters.map((filter) => [filter.column, filter.value])
        );
        if (filters.link_token === "skincare_01") {
          return {
            data: {
              id: "link_clicked",
              link_token: "skincare_01",
              destination_path: "/products/skincare-starter-set",
              status: "active"
            },
            error: null
          };
        }
        if (filters.product_id === "product_2") {
          return {
            data: {
              id: "link_purchased",
              link_token: "hydration_02",
              destination_path: "/products/hydration-skincare-set",
              status: "active"
            },
            error: null
          };
        }
      }
      if (call.table === "orders" && call.terminal === "single" && call.values) {
        return { data: { id: "order_new" }, error: null };
      }
      if (call.operation === "insert") {
        return { error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return { data: orderRow("order_new", "PAYPAL-ORDER-1"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await createPaidOrder({
      userId: "buyer_1",
      product: purchasedProduct,
      quantity: 1,
      shippingAddress: shippingAddressFixture(),
      paymentProviderOrderId: "PAYPAL-ORDER-1",
      paymentProviderCaptureId: "CAPTURE-1",
      paymentPayload: {},
      referralCode: "creator_code",
      referralLinkToken: "skincare_01",
      referralLandingPath: "/products/skincare-starter-set"
    });

    const commissionInsert = calls.find(
      (call) => call.table === "commissions" && call.operation === "insert"
    );
    expect(commissionInsert?.values).toMatchObject({
      affiliate_id: "affiliate_1",
      affiliate_link_id: "link_purchased"
    });
  });

  it("accepts an existing purchased product link that still uses a legacy destination slug", async () => {
    const calls: QueryCall[] = [];
    const purchasedProduct = {
      ...productFixture(),
      id: "product_2",
      name: "Hydration Skincare Set",
      slug: "hydration-skincare-set"
    };
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      if (call.table === "affiliates" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "affiliate_1",
            profile_id: "promoter_1",
            code: "creator_code",
            status: "active",
            profiles: { email: "creator@example.com", phone: "2135550000" }
          },
          error: null
        };
      }
      if (call.table === "affiliate_links" && call.terminal === "maybeSingle") {
        const filters = Object.fromEntries(
          call.filters.map((filter) => [filter.column, filter.value])
        );
        if (filters.link_token === "skincare_01") {
          return {
            data: {
              id: "link_clicked",
              link_token: "skincare_01",
              destination_path: "/products/skincare-starter-set",
              status: "active"
            },
            error: null
          };
        }
        if (filters.product_id === "product_2") {
          return {
            data: {
              id: "link_purchased_legacy",
              link_token: "hydration_02",
              destination_path: "/products/glass-skin-starter",
              status: "active"
            },
            error: null
          };
        }
      }
      if (call.table === "orders" && call.terminal === "single" && call.values) {
        return { data: { id: "order_new" }, error: null };
      }
      if (call.operation === "insert") {
        return { error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return { data: orderRow("order_new", "PAYPAL-ORDER-1"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await createPaidOrder({
      userId: "buyer_1",
      product: purchasedProduct,
      quantity: 1,
      shippingAddress: shippingAddressFixture(),
      paymentProviderOrderId: "PAYPAL-ORDER-1",
      paymentProviderCaptureId: "CAPTURE-1",
      paymentPayload: {},
      referralCode: "creator_code",
      referralLinkToken: "skincare_01",
      referralLandingPath: "/products/skincare-starter-set"
    });

    const commissionInsert = calls.find(
      (call) => call.table === "commissions" && call.operation === "insert"
    );
    expect(commissionInsert?.values).toMatchObject({
      affiliate_id: "affiliate_1",
      affiliate_link_id: "link_purchased_legacy"
    });
  });

  it("accepts a clicked referral link when the landing path uses the legacy product slug", async () => {
    const calls: QueryCall[] = [];
    const purchasedProduct = {
      ...productFixture(),
      id: "product_2",
      name: "Hydration Skincare Set",
      slug: "hydration-skincare-set"
    };
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      if (call.table === "affiliates" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "affiliate_1",
            profile_id: "promoter_1",
            code: "creator_code",
            status: "active",
            profiles: { email: "creator@example.com", phone: "2135550000" }
          },
          error: null
        };
      }
      if (call.table === "affiliate_links" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "link_canonical",
            link_token: "hydration_02",
            destination_path: "/products/hydration-skincare-set",
            status: "active"
          },
          error: null
        };
      }
      if (call.table === "orders" && call.terminal === "single" && call.values) {
        return { data: { id: "order_new" }, error: null };
      }
      if (call.operation === "insert") {
        return { error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return { data: orderRow("order_new", "PAYPAL-ORDER-1"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await createPaidOrder({
      userId: "buyer_1",
      product: purchasedProduct,
      quantity: 1,
      shippingAddress: shippingAddressFixture(),
      paymentProviderOrderId: "PAYPAL-ORDER-1",
      paymentProviderCaptureId: "CAPTURE-1",
      paymentPayload: {},
      referralCode: "creator_code",
      referralLinkToken: "hydration_02",
      referralLandingPath: "/products/glass-skin-starter"
    });

    const commissionInsert = calls.find(
      (call) => call.table === "commissions" && call.operation === "insert"
    );
    expect(commissionInsert?.values).toMatchObject({
      affiliate_id: "affiliate_1",
      affiliate_link_id: "link_canonical"
    });
  });

  it("does not create an order or commission with a null product link after link conflicts", async () => {
    const calls: QueryCall[] = [];
    const purchasedProduct = {
      ...productFixture(),
      id: "product_2",
      name: "Hydration Skincare Set",
      slug: "hydration-skincare-set"
    };
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "payment_transactions" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      if (call.table === "affiliates" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "affiliate_1",
            profile_id: "promoter_1",
            code: "creator_code",
            status: "active",
            profiles: { email: "creator@example.com", phone: "2135550000" }
          },
          error: null
        };
      }
      if (call.table === "affiliate_links" && call.terminal === "maybeSingle") {
        const filters = Object.fromEntries(
          call.filters.map((filter) => [filter.column, filter.value])
        );
        if (filters.link_token === "skincare_01") {
          return {
            data: {
              id: "link_clicked",
              link_token: "skincare_01",
              destination_path: "/products/skincare-starter-set",
              status: "active"
            },
            error: null
          };
        }
        if (filters.product_id === "product_2") {
          return { data: null, error: null };
        }
      }
      if (call.table === "affiliate_links" && call.operation === "insert") {
        return {
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint"
          }
        };
      }
      if (call.table === "orders" && call.terminal === "single" && call.values) {
        return { data: { id: "order_new" }, error: null };
      }
      if (call.operation === "insert") {
        return { error: null };
      }
      if (call.operation === "delete") {
        return { error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      createPaidOrder({
        userId: "buyer_1",
        product: purchasedProduct,
        quantity: 1,
        shippingAddress: shippingAddressFixture(),
        paymentProviderOrderId: "PAYPAL-ORDER-1",
        paymentProviderCaptureId: "CAPTURE-1",
        paymentPayload: {},
        referralCode: "creator_code",
        referralLinkToken: "skincare_01",
        referralLandingPath: "/products/skincare-starter-set"
      })
    ).rejects.toThrow(/Could not create affiliate link/);

    expect(
      calls.some(
        (call) =>
          call.table === "commissions" &&
          call.operation === "insert" &&
          (call.values as { affiliate_link_id?: unknown }).affiliate_link_id === null
        )
    ).toBe(false);
    expect(calls.some((call) => call.table === "orders" && call.operation === "insert")).toBe(false);
  });
});

describe("commission cancellation hooks", () => {
  it("cancels unpaid commissions when an order is refunded", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "orders" && call.operation === "update") {
        return { error: null };
      }
      if (call.table === "commissions" && call.operation === "update") {
        return { error: null };
      }
      if (call.table === "orders" && call.terminal === "maybeSingle") {
        return { data: orderRow("order_1", "PAYPAL-ORDER-1", "refunded"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateOrderFulfillment({
      orderId: "order_1",
      status: "refunded"
    });

    const commissionUpdate = calls.find(
      (call) => call.table === "commissions" && call.operation === "update"
    );
    expect(commissionUpdate?.values).toMatchObject({
      status: "cancelled",
      approved_at: null,
      paid_at: null
    });
    expect(commissionUpdate?.filters).toEqual(
      expect.arrayContaining([
        { column: "order_id", value: "order_1" },
        { column: "status", value: ["pending", "approved"] }
      ])
    );
  });

  it("cancels unpaid commissions when an affiliate is blocked", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "affiliates" && call.operation === "update") {
        return { error: null };
      }
      if (call.table === "commissions" && call.operation === "update") {
        return { error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateAffiliateStatus({
      affiliateId: "affiliate_1",
      status: "blocked"
    });

    const commissionUpdate = calls.find(
      (call) => call.table === "commissions" && call.operation === "update"
    );
    expect(commissionUpdate?.values).toMatchObject({
      status: "cancelled",
      approved_at: null,
      paid_at: null
    });
    expect(commissionUpdate?.filters).toEqual(
      expect.arrayContaining([
        { column: "affiliate_id", value: "affiliate_1" },
        { column: "status", value: ["pending", "approved"] }
      ])
    );
  });
});

describe("promoter schema detection", () => {
  it("recognizes missing migration errors from Supabase", () => {
    expect(
      isPromoterSchemaMissingError({
        code: "42703",
        message: "column affiliates.terms_accepted_at does not exist"
      })
    ).toBe(true);

    expect(
      isPromoterSchemaMissingError(
        new Error("Could not load affiliate links: Could not find public.affiliate_links")
      )
    ).toBe(true);
  });

  it("does not classify unrelated database errors as promoter setup issues", () => {
    expect(
      isPromoterSchemaMissingError({
        code: "23505",
        message: "duplicate key value violates unique constraint"
      })
    ).toBe(false);
  });
});

describe("checkout session capture binding", () => {
  it("requires checkout session payment binding to update a created session", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "checkout_sessions" && call.operation === "update" && call.terminal === "single") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      bindCheckoutSessionPayment({
        sessionId: "checkout_session_1",
        providerOrderId: "PAYPAL-ORDER-1"
      })
    ).rejects.toThrow(/bind checkout session/i);

    expect(calls[0]?.filters).toEqual(
      expect.arrayContaining([
        { column: "id", value: "checkout_session_1" },
        { column: "status", value: "created" }
      ])
    );
  });

  it("rejects sessions with malformed expiry timestamps", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "checkout_sessions" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "checkout_session_1",
            user_id: "buyer_1",
            product_id: "product_1",
            product_slug: "skincare-starter-set",
            quantity: 1,
            total_cents: 5899,
            currency: "USD",
            nonce: "session_nonce_1",
            provider_order_id: "PAYPAL-ORDER-1",
            status: "paypal_order_created",
            expires_at: "not-a-date"
          },
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    const session = await findCheckoutSessionForCapture({
      userId: "buyer_1",
      providerOrderId: "PAYPAL-ORDER-1",
      expectedCustomId: "checkout_session_1:session_nonce_1",
      productId: "product_1",
      quantity: 1,
      totalCents: 5899,
      now: new Date("2026-06-07T00:00:00.000Z")
    });

    expect(session).toBeNull();
    expect(calls[0]?.filters).toEqual(
      expect.arrayContaining([
        { column: "user_id", value: "buyer_1" },
        { column: "provider", value: "paypal" },
        { column: "provider_order_id", value: "PAYPAL-ORDER-1" },
        { column: "status", value: "paypal_order_created" }
      ])
    );
  });
});

describe("promotion token generation", () => {
  it("creates URL-safe random tokens without Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random");

    const token = createSecureRandomToken(24);

    expect(token).toHaveLength(24);
    expect(token).toMatch(/^[a-z0-9]+$/);
    expect(mathRandom).not.toHaveBeenCalled();

    mathRandom.mockRestore();
  });
});

type QueryCall = {
  table: string;
  operation: string;
  terminal: string;
  values?: unknown;
  filters: Array<{ column: string; value: unknown }>;
};

function createSupabaseMock(handler: (call: QueryCall) => unknown) {
  return {
    rpc(table: string, values?: unknown) {
      return Promise.resolve(handler({ table, operation: "rpc", terminal: "then", values, filters: [] }));
    },
    from(table: string) {
      return createQueryBuilder(table, handler);
    }
  };
}

function createQueryBuilder(table: string, handler: (call: QueryCall) => unknown) {
  const state: QueryCall = {
    table,
    operation: "select",
    terminal: "then",
    filters: []
  };
  const builder = {
    select() {
      return builder;
    },
    insert(values: unknown) {
      state.operation = "insert";
      state.values = values;
      return builder;
    },
    update(values: unknown) {
      state.operation = "update";
      state.values = values;
      return builder;
    },
    delete() {
      state.operation = "delete";
      return builder;
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    in(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    gte(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    upsert(values: unknown) {
      state.operation = "upsert";
      state.values = values;
      return Promise.resolve(handler({ ...state, terminal: "then" }));
    },
    maybeSingle() {
      return Promise.resolve(handler({ ...state, terminal: "maybeSingle" }));
    },
    single() {
      return Promise.resolve(handler({ ...state, terminal: "single" }));
    },
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(handler({ ...state, terminal: "then" })).then(resolve, reject);
    }
  };
  return builder;
}

function productRowFixture({
  id,
  name,
  slug,
  priceCents
}: {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
}): Parameters<typeof mapProductRow>[0] {
  return {
    id,
    brand_name: "shipK Curated",
    name,
    slug,
    short_description: "Short",
    description: "Description",
    hero_image_path: "/hero.png",
    status: "active",
    badges: [],
    tags: ["GLOSS", "MAKEUP", "6 ITEMS"],
    product_type: "set",
    difficulty: "Beginner",
    item_count: 6,
    intro_video_url: null,
    best_for: null,
    result: null,
    created_at: "2026-05-18T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    categories: { name: "Makeup" },
    product_options: [
      {
        id: `${id}_option`,
        name: "6-item set",
        sku: `${id.toUpperCase()}-SKU`,
        price_cents: priceCents,
        stock_quantity: 10
      }
    ],
    product_images: [],
    product_included_items: [],
    product_routine_steps: [],
    product_content_blocks: [],
    product_detail_sections: []
  };
}

function productFixture(): Product {
  return {
    id: "product_1",
    brandName: "shipK Curated",
    name: "Skincare Starter Set",
    slug: "skincare-starter-set",
    shortDescription: "Short",
    description: "Description",
    heroImagePath: "/hero.png",
	    status: "active" as const,
	    badges: [],
	    tags: ["SKINCARE", "SET"],
	    category: "Skincare",
    option: {
      id: "option_1",
      name: "5-item set",
      sku: "SK-DAILY",
      priceCents: 4_900,
      stockQuantity: 10
    },
    productType: "set" as const,
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: [],
    detailSections: []
  };
}

function completeDisclosureNotes(): NonNullable<Product["disclosureNotes"]> {
  return {
    curatorsNote: {
      selectionReason: "Selected for a refined daily routine.",
      bestFor: "Best for customers who want a simple skin-first result.",
      moodFinish: "Soft, clean, and quietly polished."
    },
    formulaBreakdown: {
      keyIngredients: "Rice extract, glycerin, and panthenol.",
      ingredientRole: "Hydration support with a comfortable finish.",
      textureFormulaNote: "Creamy texture that rinses without a tight feeling."
    },
    careCautions: {
      skinUseCautions: "Patch test before first use.",
      storageNotes: "Store away from direct sunlight.",
      regulatoryNote: "Review the package label before use."
    },
    beforeYouBuy: {
      shippingNote: "Ships from the United States fulfillment flow.",
      customsFees: "Duties and customs fees are shown before checkout when available.",
      returnsNote: "Unopened items follow the store return policy."
    }
  };
}

function shippingAddressFixture() {
  return {
    name: "Jamie Park",
    email: "jamie@example.com",
    phone: "2135550144",
    address1: "123 Ocean Ave",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
        country: "US"
  };
}

function orderRow(
  id: string,
  providerOrderId: string,
  status = "paid",
  shipment?: { carrier: string; trackingNumber: string }
) {
  return {
    id,
    user_id: "buyer_1",
    order_number: "SK123456",
    status,
    currency: "USD",
    subtotal_cents: 4900,
    shipping_cents: 999,
    total_cents: 5899,
    referral_code: null,
    created_at: "2026-05-19T00:00:00.000Z",
    order_items: [
      {
        product_name: "Skincare Starter Set",
        option_name: "5-item set",
        quantity: 1,
        product_id: "product_1",
        products: { slug: "skincare-starter-set" }
      }
    ],
    shipping_addresses: [
      {
        name: "Jamie Park",
        email: "jamie@example.com",
        phone: "2135550144",
        address1: "123 Ocean Ave",
        address2: null,
        city: "Los Angeles",
        state: "CA",
        postal_code: "90001",
        country: "US",
        memo: null
      }
    ],
    shipments: shipment
      ? [{ carrier: shipment.carrier, tracking_number: shipment.trackingNumber }]
      : [],
    payment_transactions: [{ provider_order_id: providerOrderId }]
  };
}

function commissionSettlementRow({
  id,
  affiliateId,
  orderId,
  orderNumber,
  amountCents,
  baseCents,
  status,
  holdUntil,
  affiliateCode = "creator_code",
  displayName = "Creator Kim",
  email = "creator@example.com"
}: {
  id: string;
  affiliateId: string;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  baseCents: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  holdUntil: string;
  affiliateCode?: string;
  displayName?: string;
  email?: string | null;
}) {
  return {
    id,
    affiliate_id: affiliateId,
    affiliate_link_id: "link_1",
    order_id: orderId,
    base_cents: baseCents,
    rate_bps: 1_000,
    amount_cents: amountCents,
    status,
    hold_until: holdUntil,
    created_at: "2026-05-20T00:00:00.000Z",
    orders: {
      order_number: orderNumber,
      referral_code: affiliateCode,
      order_items: [{ product_name: "Glow Set" }]
    },
    affiliate_links: { link_token: "link_1" },
    affiliates: {
      id: affiliateId,
      profile_id: `${affiliateId}_profile`,
      code: affiliateCode,
      display_name: displayName,
      status: "active",
      terms_accepted_at: "2026-05-01T00:00:00.000Z",
      created_at: "2026-05-01T00:00:00.000Z",
      profiles: { email }
    }
  };
}
