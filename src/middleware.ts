import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  REFERRAL_COOKIE_NAME,
  applyReferralClick,
  getReferralCookieMaxAgeSeconds,
  parseReferralAttribution,
  serializeReferralAttribution
} from "@/lib/referral";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const ref = request.nextUrl.searchParams.get("ref");
  const linkToken = request.nextUrl.searchParams.get("link");

  if (ref && linkToken && request.nextUrl.pathname.startsWith("/products/")) {
    try {
      const existing = await parseReferralAttribution(
        request.cookies.get(REFERRAL_COOKIE_NAME)?.value
      );
      const attribution = applyReferralClick(
        existing,
        ref,
        linkToken,
        request.nextUrl.pathname,
        new Date()
      );

      response.cookies.set(
        REFERRAL_COOKIE_NAME,
        await serializeReferralAttribution(attribution),
        {
          path: "/",
          maxAge: getReferralCookieMaxAgeSeconds(),
          sameSite: "lax",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production"
        }
      );
      response.cookies.set("shipk_ref_hint", attribution.code, {
        path: "/",
        maxAge: getReferralCookieMaxAgeSeconds(),
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production"
      });
    } catch {
      // Invalid referral parameters are ignored so an older valid click is preserved.
    }
  }

  await refreshSupabaseSession(request, response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|catalog-assets|shipk-brand).*)"]
};

async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof response.cookies.set>[2];
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const auth = supabase.auth as unknown as {
    getUser: () => Promise<unknown>;
  };

  await auth.getUser();
}
