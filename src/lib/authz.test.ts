import { describe, expect, it } from "vitest";
import {
  assertAdminProfile,
  buildAuthRedirectPath,
  getSafeNextPath,
  isAdminProfile,
  parseAuthConsentCookie,
  serializeAuthConsentCookie
} from "./authz";

describe("auth authorization helpers", () => {
  it("allows only admin profiles through admin checks", () => {
    expect(isAdminProfile({ id: "user_1", email: "admin@ship-k.com", role: "admin" })).toBe(
      true
    );
    expect(
      isAdminProfile({ id: "user_2", email: "buyer@example.com", role: "customer" })
    ).toBe(false);
    expect(isAdminProfile(null)).toBe(false);
    expect(() =>
      assertAdminProfile({ id: "user_2", email: "buyer@example.com", role: "customer" })
    ).toThrow("Admin access required");
  });

  it("builds auth redirects only for same-origin paths", () => {
    expect(buildAuthRedirectPath("/checkout?product=hanbit&qty=2")).toBe(
      "/auth?next=%2Fcheckout%3Fproduct%3Dhanbit%26qty%3D2"
    );
    expect(getSafeNextPath("https://evil.example/checkout")).toBe("/shop");
    expect(getSafeNextPath("//evil.example/checkout")).toBe("/shop");
    expect(getSafeNextPath("/admin/products")).toBe("/admin/products");
  });

  it("serializes signup consent without trusting arbitrary cookie shapes", () => {
    const cookie = serializeAuthConsentCookie({
      termsAcceptedAt: "2026-05-19T00:00:00.000Z",
      privacyAcceptedAt: "2026-05-19T00:00:00.000Z",
      marketingOptIn: true,
      marketingOptInAt: "2026-05-19T00:00:00.000Z"
    });

    expect(parseAuthConsentCookie(cookie)).toEqual({
      termsAcceptedAt: "2026-05-19T00:00:00.000Z",
      privacyAcceptedAt: "2026-05-19T00:00:00.000Z",
      marketingOptIn: true,
      marketingOptInAt: "2026-05-19T00:00:00.000Z"
    });
    expect(parseAuthConsentCookie("not-json")).toBeNull();
    expect(parseAuthConsentCookie('{"marketingOptIn":true}')).toBeNull();
  });
});
