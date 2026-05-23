export const REFERRAL_COOKIE_NAME = "shipk_referral";
export const REFERRAL_WINDOW_HOURS = 48;
const SIGNED_COOKIE_VERSION = "v1";
const REFERRAL_COOKIE_SECRET_MIN_LENGTH = 32;
const REFERRAL_WINDOW_MS = REFERRAL_WINDOW_HOURS * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const DEV_REFERRAL_COOKIE_SECRET =
  "shipk-dev-referral-cookie-secret-do-not-use-in-production";

export type ReferralAttribution = {
  code: string;
  linkToken: string;
  landingPath: string;
  clickedAt: string;
  expiresAt: string;
};

export function applyReferralClick(
  _existing: ReferralAttribution | null,
  rawCode: string,
  rawLinkToken: string,
  rawLandingPath: string,
  clickedAt = new Date()
): ReferralAttribution {
  const code = normalizeReferralCode(rawCode);
  const linkToken = normalizeLinkToken(rawLinkToken);
  const landingPath = normalizeReferralLandingPath(rawLandingPath);
  const expiresAt = new Date(clickedAt);
  expiresAt.setUTCHours(expiresAt.getUTCHours() + REFERRAL_WINDOW_HOURS);

  return {
    code,
    linkToken,
    landingPath,
    clickedAt: clickedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}

export function isReferralAttributionExpired(
  attribution: ReferralAttribution | null,
  now = new Date()
) {
  if (!attribution) {
    return true;
  }
  const expiresAt = Date.parse(attribution.expiresAt);
  if (!Number.isFinite(expiresAt)) {
    return true;
  }
  return now.getTime() > expiresAt;
}

export function getReferralCookieMaxAgeSeconds() {
  return 60 * 60 * REFERRAL_WINDOW_HOURS;
}

export async function serializeReferralAttribution(attribution: ReferralAttribution) {
  const payload = base64UrlEncode(JSON.stringify(attribution));
  const signature = await signReferralPayload(payload);
  return `${SIGNED_COOKIE_VERSION}.${payload}.${signature}`;
}

export async function parseReferralAttribution(
  rawValue: string | undefined,
  now = new Date()
): Promise<ReferralAttribution | null> {
  if (!rawValue) {
    return null;
  }

  try {
    const parts = rawValue.split(".");
    if (parts.length !== 3 || parts[0] !== SIGNED_COOKIE_VERSION) {
      return null;
    }
    const [, payload, signature] = parts;
    const verified = await verifyReferralPayload(payload, signature);
    if (!verified) {
      return null;
    }
    const parsed = JSON.parse(base64UrlDecodeToString(payload)) as ReferralAttribution;
    return normalizeParsedAttribution(parsed, now);
  } catch {
    return null;
  }

  return null;
}

export function buildProductReferralPath({
  productSlug,
  referralCode,
  linkToken
}: {
  productSlug: string;
  referralCode: string;
  linkToken: string;
}) {
  const slug = productSlug.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    throw new Error("Invalid product slug");
  }

  const params = new URLSearchParams({
    ref: normalizeReferralCode(referralCode),
    link: normalizeLinkToken(linkToken)
  });

  return `/products/${slug}?${params.toString()}`;
}

export function normalizeReferralLandingPath(rawPath: string) {
  const path = rawPath.trim();
  const pathname = path.startsWith("/")
    ? path.split(/[?#]/)[0]
    : new URL(path).pathname;

  if (!/^\/products\/[a-z0-9-]{1,120}$/.test(pathname)) {
    throw new Error("Invalid referral landing path");
  }

  return pathname;
}

function normalizeReferralCode(rawCode: string) {
  const code = rawCode.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,64}$/.test(code)) {
    throw new Error("Invalid referral code");
  }
  return code;
}

function normalizeLinkToken(rawToken: string) {
  const token = rawToken.trim().toLowerCase();
  if (!/^[a-z0-9_-]{8,96}$/.test(token)) {
    throw new Error("Invalid referral link token");
  }
  return token;
}

function normalizeParsedAttribution(
  parsed: ReferralAttribution,
  now: Date
): ReferralAttribution | null {
  if (
    typeof parsed.code !== "string" ||
    typeof parsed.linkToken !== "string" ||
    typeof parsed.landingPath !== "string" ||
    typeof parsed.clickedAt !== "string" ||
    typeof parsed.expiresAt !== "string"
  ) {
    return null;
  }

  const clickedAt = Date.parse(parsed.clickedAt);
  const expiresAt = Date.parse(parsed.expiresAt);
  if (!Number.isFinite(clickedAt) || !Number.isFinite(expiresAt)) {
    return null;
  }
  if (clickedAt > now.getTime() + CLOCK_SKEW_MS) {
    return null;
  }
  if (expiresAt <= clickedAt || expiresAt - clickedAt > REFERRAL_WINDOW_MS + 1000) {
    return null;
  }
  if (now.getTime() > expiresAt) {
    return null;
  }

  return {
    code: normalizeReferralCode(parsed.code),
    linkToken: normalizeLinkToken(parsed.linkToken),
    landingPath: normalizeReferralLandingPath(parsed.landingPath),
    clickedAt: new Date(clickedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString()
  };
}

async function signReferralPayload(payload: string) {
  const key = await importReferralCookieKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifyReferralPayload(payload: string, signature: string) {
  const key = await importReferralCookieKey();
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(payload)
  );
}

async function importReferralCookieKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getReferralCookieSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function getReferralCookieSecret() {
  const configured = process.env.REFERRAL_COOKIE_SECRET?.trim();
  if (configured && configured.length >= REFERRAL_COOKIE_SECRET_MIN_LENGTH) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Referral cookie secret is not configured");
  }
  return DEV_REFERRAL_COOKIE_SECRET;
}

function base64UrlEncode(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecodeToString(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Invalid base64url value");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  if (bytesToBase64Url(bytes) !== value) {
    throw new Error("Invalid base64url value");
  }

  return bytes;
}
