import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyReferralClick,
  buildProductReferralPath,
  getReferralCookieMaxAgeSeconds,
  isReferralAttributionExpired,
  parseReferralAttribution,
  serializeReferralAttribution
} from "./referral";

const now = new Date("2026-05-18T00:00:00.000Z");
describe("referral attribution", () => {
  beforeEach(() => {
    vi.stubEnv("REFERRAL_COOKIE_SECRET", "test-referral-cookie-secret-at-least-32-chars");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores last-click attribution for 48 hours with link tokens", () => {
    const attribution = applyReferralClick(
      null,
      "creator_code",
      "skincare_01",
      "/products/skincare-starter-set",
      now
    );

    expect(attribution).toEqual({
      code: "creator_code",
      linkToken: "skincare_01",
      landingPath: "/products/skincare-starter-set",
      clickedAt: "2026-05-18T00:00:00.000Z",
      expiresAt: "2026-05-20T00:00:00.000Z"
    });
    expect(getReferralCookieMaxAgeSeconds()).toBe(60 * 60 * 48);
  });

  it("updates existing attribution when a newer ref is clicked", () => {
    const existing = applyReferralClick(
      null,
      "first_creator",
      "first_link",
      "/products/first-set",
      now
    );
    const next = applyReferralClick(
      existing,
      "second_creator",
      "second_link",
      "/products/second-set?ref=second_creator&link=second_link",
      new Date("2026-05-20T09:30:00.000Z"),
    );

    expect(next.code).toBe("second_creator");
    expect(next.linkToken).toBe("second_link");
    expect(next.landingPath).toBe("/products/second-set");
    expect(next.clickedAt).toBe("2026-05-20T09:30:00.000Z");
    expect(next.expiresAt).toBe("2026-05-22T09:30:00.000Z");
  });

  it("treats attribution as expired after 48 hours", () => {
    const attribution = applyReferralClick(
      null,
      "creator_code",
      "skincare_01",
      "/products/skincare-starter-set",
      now
    );

    expect(
      isReferralAttributionExpired(
        attribution,
        new Date("2026-05-19T23:59:59.999Z")
      )
    ).toBe(false);
    expect(
      isReferralAttributionExpired(
        attribution,
        new Date("2026-05-20T00:00:00.001Z")
      )
    ).toBe(true);
  });

  it("builds product referral paths with both ref and link tokens", () => {
    expect(
      buildProductReferralPath({
        productSlug: "skincare-starter-set",
        referralCode: "creator_code",
        linkToken: "skincare_01"
      })
    ).toBe("/products/skincare-starter-set?ref=creator_code&link=skincare_01");
  });

  it("rejects attribution without a canonical product landing path", () => {
    expect(() =>
      applyReferralClick(null, "creator_code", "skincare_01", "/shop", now)
    ).toThrow("Invalid referral landing path");
  });

  it("round-trips signed referral attribution cookies", async () => {
    const attribution = applyReferralClick(
      null,
      "creator_code",
      "skincare_01",
      "/products/skincare-starter-set",
      now
    );

    const serialized = await serializeReferralAttribution(attribution);

    expect(serialized).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    await expect(
      parseReferralAttribution(serialized, new Date("2026-05-18T00:01:00.000Z"))
    ).resolves.toEqual(attribution);
  });

  it("rejects tampered and legacy unsigned referral cookies", async () => {
    const attribution = applyReferralClick(
      null,
      "creator_code",
      "skincare_01",
      "/products/skincare-starter-set",
      now
    );
    const serialized = await serializeReferralAttribution(attribution);
    const tampered = `${serialized.slice(0, -1)}${serialized.endsWith("a") ? "b" : "a"}`;
    const legacyUnsigned = encodeURIComponent(JSON.stringify(attribution));

    await expect(parseReferralAttribution(tampered, now)).resolves.toBeNull();
    await expect(parseReferralAttribution(legacyUnsigned, now)).resolves.toBeNull();
  });

  it("rejects invalid or overlong attribution dates", async () => {
    const invalidDate = await signRawAttribution({
      code: "creator_code",
      linkToken: "skincare_01",
      landingPath: "/products/skincare-starter-set",
      clickedAt: "not-a-date",
      expiresAt: "not-a-date"
    });
    const farExpiry = await signRawAttribution({
      code: "creator_code",
      linkToken: "skincare_01",
      landingPath: "/products/skincare-starter-set",
      clickedAt: "2026-05-18T00:00:00.000Z",
      expiresAt: "2099-05-18T00:00:00.000Z"
    });

    await expect(parseReferralAttribution(invalidDate, now)).resolves.toBeNull();
    await expect(parseReferralAttribution(farExpiry, now)).resolves.toBeNull();
    expect(
      isReferralAttributionExpired({
        code: "creator_code",
        linkToken: "skincare_01",
        landingPath: "/products/skincare-starter-set",
        clickedAt: "2026-05-18T00:00:00.000Z",
        expiresAt: "not-a-date"
      })
    ).toBe(true);
  });

  it("fails closed in production when the signing secret is missing", async () => {
    delete process.env.REFERRAL_COOKIE_SECRET;
    vi.stubEnv("NODE_ENV", "production");

    await expect(() =>
      serializeReferralAttribution(
        applyReferralClick(null, "creator_code", "skincare_01", "/products/skincare-starter-set", now)
      )
    ).rejects.toThrow("Referral cookie secret is not configured");
  });
});

async function signRawAttribution(value: Record<string, unknown>) {
  return serializeReferralAttribution(value as ReturnType<typeof applyReferralClick>);
}
