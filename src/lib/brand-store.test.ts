import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrandAccessDeniedError,
  BrandInputError,
  BrandProductNotFoundError,
  buildBrandReportSummary,
  connectBrandMember,
  updateBrandProductContentForUser
} from "./brand-store";

const mocks = vi.hoisted(() => ({
  privilegedClient: undefined as unknown
}));

vi.mock("./supabase/admin", () => ({
  createSupabasePrivilegedClient: () => mocks.privilegedClient
}));

beforeEach(() => {
  mocks.privilegedClient = undefined;
});

describe("brand product store authorization", () => {
  it("denies detail updates when a customer has no active brand membership", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "brand_memberships" && call.terminal === "then") {
        return { data: [], error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      updateBrandProductContentForUser({
        userId: "customer_1",
        productId: "product_1",
        input: minimalContentPayload()
      })
    ).rejects.toBeInstanceOf(BrandAccessDeniedError);

    expect(calls.some((call) => call.operation === "update")).toBe(false);
  });

  it("denies detail updates for products assigned to another brand", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "brand_memberships" && call.terminal === "then") {
        return { data: [membershipRow("brand_1")], error: null };
      }
      if (call.table === "product_brand_assignments" && call.terminal === "maybeSingle") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      updateBrandProductContentForUser({
        userId: "brand_member_1",
        productId: "product_2",
        input: minimalContentPayload()
      })
    ).rejects.toBeInstanceOf(BrandProductNotFoundError);

    expect(calls.some((call) => call.operation === "update")).toBe(false);
  });

  it("updates only allowed detail content fields for an assigned brand product", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "brand_memberships" && call.terminal === "then") {
        return { data: [membershipRow("brand_1")], error: null };
      }
      if (call.table === "product_brand_assignments" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "assignment_1",
            brand_partner_id: "brand_1",
            product_id: "product_1",
            status: "active",
            can_edit_details: true
          },
          error: null
        };
      }
      if (call.table === "products" && call.operation === "update") {
        return { error: null };
      }
      if (call.table === "product_brand_assignments" && call.operation === "update") {
        return { error: null };
      }
      if (call.operation === "delete") {
        return { error: null };
      }
      if (call.operation === "insert") {
        return { error: null };
      }
      if (call.table === "products" && call.terminal === "maybeSingle") {
        return { data: productRow("product_1"), error: null };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await updateBrandProductContentForUser({
      userId: "brand_member_1",
      productId: "product_1",
      input: {
        ...minimalContentPayload(),
        bestFor: "아침 루틴",
        result: "촉촉한 마무리",
        galleryImages: [{ imagePath: "/gallery.png", altText: "갤러리" }],
        routineSteps: [{ title: "바르기", body: "얇게 바릅니다." }],
        contentBlocks: [{ type: "text", title: "브랜드 팁", body: "천천히 흡수시켜 주세요.", imagePosition: "left" }]
      }
    });

    const productUpdate = calls.find(
      (call) => call.table === "products" && call.operation === "update"
    );
    expect(productUpdate?.values).toMatchObject({
      short_description: "브랜드 상세 요약",
      description: "브랜드 상세 본문",
      best_for: "아침 루틴",
      result: "촉촉한 마무리"
    });
    expect(productUpdate?.values).not.toHaveProperty("price_cents");
    expect(productUpdate?.values).not.toHaveProperty("sku");
    expect(productUpdate?.values).not.toHaveProperty("stock_quantity");
    expect(productUpdate?.values).not.toHaveProperty("status");
    expect(productUpdate?.values).not.toHaveProperty("name");
    expect(productUpdate?.values).not.toHaveProperty("brand_name");
  });
});

describe("brand report aggregation", () => {
  it("summarizes only scoped product line items and excludes cancelled/refunded orders from positive totals", () => {
    const summary = buildBrandReportSummary({
      productIds: ["product_a"],
      rows: [
        reportRow({
          orderId: "order_1",
          productId: "product_a",
          productName: "A 세트",
          status: "paid",
          lineTotalCents: 4900,
          quantity: 1
        }),
        reportRow({
          orderId: "order_1",
          productId: "product_b",
          productName: "B 세트",
          status: "paid",
          lineTotalCents: 3900,
          quantity: 1
        }),
        reportRow({
          orderId: "order_2",
          productId: "product_a",
          productName: "A 세트",
          status: "refunded",
          lineTotalCents: 4900,
          quantity: 1
        })
      ]
    });

    expect(summary.totalOrders).toBe(1);
    expect(summary.unitsSold).toBe(1);
    expect(summary.grossSalesCents).toBe(4900);
    expect(summary.excludedSalesCents).toBe(4900);
    expect(summary.products).toEqual([
      expect.objectContaining({
        productId: "product_a",
        productName: "A 세트",
        grossSalesCents: 4900,
        unitsSold: 1
      })
    ]);
  });
});

describe("brand member connection", () => {
  it("refuses to connect non-customer profiles as brand members", async () => {
    const calls: QueryCall[] = [];
    mocks.privilegedClient = createSupabaseMock((call) => {
      calls.push(call);
      if (call.table === "profiles" && call.terminal === "maybeSingle") {
        return {
          data: {
            id: "admin_1",
            email: "admin@example.com",
            full_name: "Admin",
            role: "admin"
          },
          error: null
        };
      }
      throw new Error(`Unexpected query: ${call.table}.${call.operation}.${call.terminal}`);
    });

    await expect(
      connectBrandMember({
        brandId: "brand_1",
        email: "admin@example.com"
      })
    ).rejects.toBeInstanceOf(BrandInputError);

    expect(calls).toHaveLength(1);
    expect(calls.some((call) => call.table === "brand_memberships")).toBe(false);
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
      state.operation = "select";
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

function minimalContentPayload() {
  return {
    shortDescription: "브랜드 상세 요약",
    description: "브랜드 상세 본문",
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: []
  };
}

function membershipRow(brandId: string) {
  return {
    id: "membership_1",
    brand_partner_id: brandId,
    profile_id: "brand_member_1",
    member_role: "editor",
    status: "active",
    brand_partners: {
      id: brandId,
      name: "Glow Brand",
      slug: "glow-brand",
      status: "active"
    }
  };
}

function productRow(id: string) {
  return {
    id,
    brand_name: "Glow Brand",
    name: "Glow Set",
    slug: "glow-set",
    short_description: "브랜드 상세 요약",
    description: "브랜드 상세 본문",
    hero_image_path: "/hero.png",
    status: "active",
    badges: [],
    product_type: "curated_set",
    collection_slug: "daily-glow",
    collection_name: "Daily Glow",
    difficulty: "Beginner",
    item_count: 1,
    theme_label: "DAILY",
    intro_video_url: null,
    best_for: "아침 루틴",
    result: "촉촉한 마무리",
    updated_at: "2026-05-28T00:00:00.000Z",
    categories: { name: "Routine Kit" },
    product_options: [
      {
        id: "option_1",
        name: "Default option",
        sku: "GLOW-SET",
        price_cents: 4900,
        stock_quantity: 10
      }
    ],
    product_images: [],
    product_included_items: [],
    product_routine_steps: [],
    product_content_blocks: []
  };
}

function reportRow({
  orderId,
  productId,
  productName,
  status,
  lineTotalCents,
  quantity
}: {
  orderId: string;
  productId: string;
  productName: string;
  status: string;
  lineTotalCents: number;
  quantity: number;
}) {
  return {
    order_id: orderId,
    product_id: productId,
    product_name: productName,
    quantity,
    line_total_cents: lineTotalCents,
    orders: {
      id: orderId,
      status,
      created_at: "2026-05-28T00:00:00.000Z"
    }
  };
}
