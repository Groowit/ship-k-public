import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuthConsent, AuthProfile, assertAdminProfile } from "./authz";
import type { DefaultShippingAddressInput } from "./mvp-store";

export type ProfileWithConsent = AuthProfile & {
  fullName: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  marketingOptInAt: string | null;
  defaultShippingAddress: DefaultShippingAddressInput;
};

export type AuthState = {
  user: User | null;
  profile: ProfileWithConsent | null;
};

export class AuthRequiredError extends Error {
  status = 401;

  constructor() {
    super("Authentication required");
  }
}

export class AdminRequiredError extends Error {
  status = 403;

  constructor() {
    super("Admin access required");
  }
}

export async function getCurrentAuthState(): Promise<AuthState> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, profile: null };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id,email,role,full_name,phone,marketing_opt_in,terms_accepted_at,privacy_accepted_at,marketing_opt_in_at,default_shipping_name,default_shipping_phone,default_shipping_address1,default_shipping_address2,default_shipping_city,default_shipping_state,default_shipping_postal_code,default_shipping_country,default_shipping_memo"
      )
      .eq("id", user.id)
      .maybeSingle();

    return {
      user,
      profile: profile
        ? {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            fullName: profile.full_name,
            phone: profile.phone,
            marketingOptIn: profile.marketing_opt_in,
            termsAcceptedAt: profile.terms_accepted_at,
            privacyAcceptedAt: profile.privacy_accepted_at,
            marketingOptInAt: profile.marketing_opt_in_at,
            defaultShippingAddress: {
              name: profile.default_shipping_name ?? "",
              phone: profile.default_shipping_phone ?? "",
              address1: profile.default_shipping_address1 ?? "",
              address2: profile.default_shipping_address2 ?? undefined,
              city: profile.default_shipping_city ?? "",
              state: profile.default_shipping_state ?? "",
              postalCode: profile.default_shipping_postal_code ?? "",
              country: profile.default_shipping_country ?? "US",
              memo: profile.default_shipping_memo ?? undefined
            }
          }
        : null
    };
  } catch {
    return { user: null, profile: null };
  }
}

export async function requireCurrentUser(): Promise<AuthState & { user: User }> {
  const auth = await getCurrentAuthState();
  if (!auth.user) {
    throw new AuthRequiredError();
  }
  return { ...auth, user: auth.user };
}

export async function requireCurrentAdmin(): Promise<AuthState & { user: User }> {
  const auth = await requireCurrentUser();
  try {
    assertAdminProfile(auth.profile);
  } catch {
    throw new AdminRequiredError();
  }
  return auth;
}

export function getConsentProfileUpdate(consent: AuthConsent) {
  return {
    terms_accepted_at: consent.termsAcceptedAt,
    privacy_accepted_at: consent.privacyAcceptedAt,
    marketing_opt_in: consent.marketingOptIn,
    marketing_opt_in_at: consent.marketingOptInAt
  };
}
