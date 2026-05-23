export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? "ops@ship-k.local";
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isPayPalMockEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.NEXT_PUBLIC_PAYPAL_MOCK === "true" || !process.env.PAYPAL_CLIENT_SECRET;
}
