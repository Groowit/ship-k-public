import { NextResponse } from "next/server";
import { getConsentProfileUpdate } from "@/lib/auth";
import {
  AUTH_CONSENT_COOKIE_NAME,
  getSafeNextPath,
  parseAuthConsentCookie
} from "@/lib/authz";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, getAppUrl()));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth?error=oauth", getAppUrl()));
    }

    const consent = parseAuthConsentCookie(
      request.headers
        .get("cookie")
        ?.split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${AUTH_CONSENT_COOKIE_NAME}=`))
        ?.split("=")
        .slice(1)
        .join("=")
    );
    const userId = data.user?.id;

    if (consent && userId) {
      await supabase
        .from("profiles")
        .update(getConsentProfileUpdate(consent))
        .eq("id", userId);
      response.cookies.set(AUTH_CONSENT_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0
      });
    }
  }

  return response;
}
