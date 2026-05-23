import { createClient } from "@supabase/supabase-js";

export function getSupabasePrivilegedKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (secretKey) {
    return secretKey;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleKey) {
    return serviceRoleKey;
  }

  throw new Error("Supabase privileged server key is not configured");
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured");
  }

  return createClient(supabaseUrl, getSupabasePrivilegedKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export const createSupabasePrivilegedClient = createSupabaseAdminClient;
