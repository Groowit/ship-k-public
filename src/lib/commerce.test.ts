import { describe, expect, it } from "vitest";
import {
  assertAdminEmail,
  calculateCommissionCents,
  calculateOrderTotals,
  calculateShippingCents,
  canTransitionOrderStatus,
  formatUsd,
  isAdminEmail,
  shouldCreateReferralCommission
} from "./commerce";

describe("commerce domain rules", () => {
  it("uses free shipping at or above $75 and $9.99 below it", () => {
    expect(calculateShippingCents(7_500)).toBe(0);
    expect(calculateShippingCents(7_499)).toBe(999);
  });

  it("calculates commission from product net amount only", () => {
    expect(
      calculateCommissionCents({
        productNetCents: 4_200,
        shippingCents: 999,
        discountCents: 0,
        rateBps: 1_000
      })
    ).toBe(420);
  });

  it("calculates USD order totals from item subtotal plus shipping", () => {
    expect(
      calculateOrderTotals([
        { unitPriceCents: 2_400, quantity: 2 },
        { unitPriceCents: 1_900, quantity: 1 }
      ])
    ).toEqual({
      subtotalCents: 6_700,
      shippingCents: 999,
      totalCents: 7_699,
      currency: "USD"
    });
  });

  it("formats USD values from cents", () => {
    expect(formatUsd(7_699)).toBe("$76.99");
  });

  it("allows the MVP order status path and rejects skipped transitions", () => {
    expect(canTransitionOrderStatus("pending_payment", "paid")).toBe(true);
    expect(canTransitionOrderStatus("paid", "preparing")).toBe(true);
    expect(canTransitionOrderStatus("preparing", "shipped")).toBe(true);
    expect(canTransitionOrderStatus("shipped", "delivered")).toBe(true);
    expect(canTransitionOrderStatus("pending_payment", "shipped")).toBe(false);
  });

  it("matches ADMIN_EMAIL case-insensitively and rejects mutations otherwise", () => {
    expect(isAdminEmail("OPS@SHIP-K.COM", "ops@ship-k.com")).toBe(true);
    expect(isAdminEmail("buyer@example.com", "ops@ship-k.com")).toBe(false);
    expect(() => assertAdminEmail("buyer@example.com", "ops@ship-k.com")).toThrow(
      "Admin access required"
    );
  });

  it("creates referral commissions only for active non-self referrals", () => {
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "promoter_1",
        orderUserId: "buyer_1",
        affiliateStatus: "active",
        linkStatus: "active"
      })
    ).toBe(true);
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "buyer_1",
        orderUserId: "buyer_1",
        affiliateStatus: "active",
        linkStatus: "active"
      })
    ).toBe(false);
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "promoter_1",
        orderUserId: "buyer_1",
        affiliateStatus: "blocked",
        linkStatus: "active"
      })
    ).toBe(false);
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "promoter_1",
        orderUserId: "buyer_1",
        affiliateStatus: "active",
        linkStatus: "paused"
      })
    ).toBe(false);
  });

  it("rejects referral commissions for same email or phone self-dealing", () => {
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "promoter_1",
        orderUserId: "buyer_1",
        affiliateStatus: "active",
        linkStatus: "active",
        affiliateEmail: "Creator@Example.com",
        orderEmail: " creator@example.com "
      })
    ).toBe(false);
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "promoter_1",
        orderUserId: "buyer_1",
        affiliateStatus: "active",
        linkStatus: "active",
        affiliatePhone: "(213) 555-0144",
        orderPhone: "2135550144"
      })
    ).toBe(false);
    expect(
      shouldCreateReferralCommission({
        affiliateProfileId: "promoter_1",
        orderUserId: "buyer_1",
        affiliateStatus: "active",
        linkStatus: "active",
        affiliateEmail: "creator@example.com",
        orderEmail: "buyer@example.com",
        affiliatePhone: "2135550144",
        orderPhone: "3105550199"
      })
    ).toBe(true);
  });
});
