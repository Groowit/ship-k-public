import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPaidOrder,
  getOrderByUser,
  getCommissionStatusUpdateValues,
  getTrackingUrl,
  isPromoterSchemaMissingError,
  mapOrderRow,
  mapProductRow,
  updateCustomerAccount,
  updateAffiliateStatus,
  updateOrderFulfillment
} from "./commerce-store";

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
          product_name: "Daily K-Glow Set",
          option_name: "5-item routine kit",
          quantity: 1,
          product_id: "product_1",
          products: { slug: "daily-k-glow-set" }
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
      productSlug: "daily-k-glow-set",
      productName: "Daily K-Glow Set",
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
  it("maps gallery images and structured detail rows in sort order", () => {
    const row = {
      id: "product_1",
      brand_name: "shipK Curated",
      name: "Daily K-Glow Set",
      slug: "daily-k-glow-set",
      short_description: "Short",
      description: "Description",
      hero_image_path: "/hero.png",
      status: "active",
      badges: ["BEST"],
      product_type: "curated_set",
      collection_slug: "daily-glow",
      collection_name: "Daily Glow",
      difficulty: "Beginner",
      item_count: 5,
      theme_label: "DAILY",
      intro_video_url: null,
      best_for: "Daily routines",
      result: "Glow",
      updated_at: "2026-05-19T00:00:00.000Z",
      categories: { name: "Routine Kit" },
      product_options: [
        {
          id: "option_1",
          name: "5-item routine kit",
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
    expect(product.updatedAt).toBe("2026-05-19T00:00:00.000Z");
    expect(product.contentBlocks[0]).toMatchObject({
      type: "text",
      title: "Story"
    });
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

function productFixture() {
  return {
    id: "product_1",
    brandName: "shipK Curated",
    name: "Daily K-Glow Set",
    slug: "daily-k-glow-set",
    shortDescription: "Short",
    description: "Description",
    heroImagePath: "/hero.png",
    status: "active" as const,
    badges: [],
    category: "Routine Kit",
    option: {
      id: "option_1",
      name: "5-item routine kit",
      sku: "SK-DAILY",
      priceCents: 4_900,
      stockQuantity: 10
    },
    collectionSlug: "daily-glow" as const,
    collectionName: "Daily Glow",
    productType: "curated_set" as const,
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: []
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
    country: "US" as const
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
        product_name: "Daily K-Glow Set",
        option_name: "5-item routine kit",
        quantity: 1,
        product_id: "product_1",
        products: { slug: "daily-k-glow-set" }
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
