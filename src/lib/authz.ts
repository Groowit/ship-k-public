export const AUTH_CONSENT_COOKIE_NAME = "shipk_auth_consent";

export type ProfileRole = "customer" | "admin";

export type AuthProfile = {
  id: string;
  email: string;
  role: ProfileRole;
};

export type AuthConsent = {
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingOptIn: boolean;
  marketingOptInAt: string | null;
};

export function isAdminProfile(
  profile: AuthProfile | { role?: ProfileRole | null } | null | undefined
) {
  return profile?.role === "admin";
}

export function assertAdminProfile(
  profile: AuthProfile | { role?: ProfileRole | null } | null | undefined
) {
  if (!isAdminProfile(profile)) {
    throw new Error("Admin access required");
  }
}

export function getSafeNextPath(
  rawNext: string | null | undefined,
  fallback = "/shop"
) {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(rawNext, "https://ship-k.local");
    if (parsed.origin !== "https://ship-k.local") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthRedirectPath(nextPath: string) {
  return `/auth?next=${encodeURIComponent(getSafeNextPath(nextPath))}`;
}

export function createAuthConsent(
  marketingOptIn: boolean,
  now = new Date()
): AuthConsent {
  const acceptedAt = now.toISOString();
  return {
    termsAcceptedAt: acceptedAt,
    privacyAcceptedAt: acceptedAt,
    marketingOptIn,
    marketingOptInAt: marketingOptIn ? acceptedAt : null
  };
}

export function serializeAuthConsentCookie(consent: AuthConsent) {
  return encodeURIComponent(JSON.stringify(consent));
}

export function parseAuthConsentCookie(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<AuthConsent>;
    if (
      typeof parsed.termsAcceptedAt !== "string" ||
      typeof parsed.privacyAcceptedAt !== "string" ||
      typeof parsed.marketingOptIn !== "boolean"
    ) {
      return null;
    }
    if (
      parsed.marketingOptInAt !== null &&
      parsed.marketingOptInAt !== undefined &&
      typeof parsed.marketingOptInAt !== "string"
    ) {
      return null;
    }

    return {
      termsAcceptedAt: parsed.termsAcceptedAt,
      privacyAcceptedAt: parsed.privacyAcceptedAt,
      marketingOptIn: parsed.marketingOptIn,
      marketingOptInAt: parsed.marketingOptInAt ?? null
    };
  } catch {
    return null;
  }
}
