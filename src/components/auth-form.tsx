"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useState } from "react";
import { GoogleIdentityButton } from "@/components/google-identity-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AUTH_CONSENT_COOKIE_NAME,
  createAuthConsent,
  getSafeNextPath,
  serializeAuthConsentCookie
} from "@/lib/authz";
import type { GoogleCredentialResponse } from "@/lib/google-identity";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({
  nextPath = "/shop",
  initialMode = "sign-in"
}: {
  nextPath?: string;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalAgreed, setLegalAgreed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const safeNextPath = getSafeNextPath(nextPath);
  const isSignUp = mode === "sign-up";
  const copy = isSignUp
    ? {
        eyebrow: "New routine",
        title: "Create your shipK account",
        description: "Save your favorite routine kits and get clear order updates.",
        primaryAction: "Create account",
        alternateLead: "Already have an account?",
        alternateAction: "Sign in",
        alternateMode: "sign-in" as const
      }
    : {
        eyebrow: "Welcome back",
        title: "Sign in to shipK",
        description: "Continue checkout, review recent orders, and keep your K-beauty picks close.",
        primaryAction: "Sign in",
        alternateLead: "New to shipK?",
        alternateAction: "Create an account",
        alternateMode: "sign-up" as const
      };

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signInWithPassword();
  }

  async function signInWithPassword() {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const consent = isSignUp ? createAuthConsent(marketingOptIn) : null;
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await signUpWithConsent(consent);

      if (result.error) {
        throw result.error;
      }

      if (isSignUp && result.data.user && consent) {
        await supabase
          .from("profiles")
          .update({
            terms_accepted_at: consent.termsAcceptedAt,
            privacy_accepted_at: consent.privacyAcceptedAt,
            marketing_opt_in: consent.marketingOptIn,
            marketing_opt_in_at: consent.marketingOptInAt
          })
          .eq("id", result.data.user.id);
      }

      if (result.data.session || mode === "sign-in") {
        router.push(safeNextPath);
        router.refresh();
        return;
      }

      setMessage(
        "We sent a confirmation email. Please check your inbox to finish creating your account."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication is unavailable in this environment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const showGoogleError = useCallback((error: Error) => {
    setMessage(error.message);
  }, []);

  const signInWithGoogle = useCallback(async (
    response: GoogleCredentialResponse,
    nonce: string
  ) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      if (!response.credential) {
        throw new Error("Google did not return an ID token.");
      }

      const supabase = createSupabaseBrowserClient();
      const consent = isSignUp ? createAuthConsent(marketingOptIn) : null;

      if (isSignUp) {
        if (!legalAgreed || !consent) {
          throw new Error("Please accept the Terms and Privacy Policy to create an account.");
        }
        document.cookie = `${AUTH_CONSENT_COOKIE_NAME}=${serializeAuthConsentCookie(
          consent
        )}; path=/; max-age=600; SameSite=Lax${
          window.location.protocol === "https:" ? "; Secure" : ""
        }`;
      } else {
        document.cookie = `${AUTH_CONSENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${
          window.location.protocol === "https:" ? "; Secure" : ""
        }`;
      }

      const result = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce
      });

      if (result.error) {
        throw result.error;
      }

      if (isSignUp && result.data.user && consent) {
        await supabase
          .from("profiles")
          .update({
            terms_accepted_at: consent.termsAcceptedAt,
            privacy_accepted_at: consent.privacyAcceptedAt,
            marketing_opt_in: consent.marketingOptIn,
            marketing_opt_in_at: consent.marketingOptInAt
          })
          .eq("id", result.data.user.id);
      }

      router.push(safeNextPath);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in is unavailable in this environment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [isSignUp, legalAgreed, marketingOptIn, router, safeNextPath]);

  async function signUpWithConsent(consent: ReturnType<typeof createAuthConsent> | null) {
    ensureLegalAgreement();
    if (!consent) {
      throw new Error("Please accept the Terms and Privacy Policy to create an account.");
    }

    const supabase = createSupabaseBrowserClient();
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          safeNextPath
        )}`,
        data: {
          terms_accepted_at: consent.termsAcceptedAt,
          privacy_accepted_at: consent.privacyAcceptedAt,
          marketing_opt_in: consent.marketingOptIn,
          marketing_opt_in_at: consent.marketingOptInAt
        }
      }
    });
  }

  function ensureLegalAgreement() {
    if (!legalAgreed) {
      throw new Error("Please accept the Terms and Privacy Policy to create an account.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card
        className="overflow-hidden rounded-md border-2 border-black bg-white shadow-none"
        data-auth-card
      >
        <div className="grid h-2 grid-cols-4 border-b-2 border-black" aria-hidden="true">
          <span className="bg-[#ff3d7f]" />
          <span className="bg-[#ffe25a]" />
          <span className="bg-[#b4f0dc]" />
          <span className="bg-[#c8f26c]" />
        </div>
        <CardHeader className="space-y-3 p-5 pb-4 sm:p-6 sm:pb-4">
          <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f]">
            {copy.eyebrow}
          </p>
          <CardTitle className="shipk-heading text-2xl sm:text-3xl">
            {copy.title}
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.description}
          </p>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-5">
            <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
              <div>
                <Label htmlFor="shipk-auth-email" className="font-black">
                  Email
                </Label>
                <Input
                  id="shipk-auth-email"
                  className="mt-2 h-12 border-2 border-black px-4 text-base shadow-none"
                  aria-label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="shipk-auth-password" className="font-black">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="shipk-auth-password"
                    className="h-12 border-2 border-black px-4 pr-12 text-base shadow-none"
                    aria-label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    className="focus-ring absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-[#fff8f0] hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              {isSignUp ? (
                <fieldset className="grid gap-3 rounded-md border-2 border-black bg-[#fff8f0] p-4 text-sm leading-6">
                  <legend className="px-1 font-brand-heavy text-[0.7rem] uppercase text-[#ff3d7f]">
                    Required for account creation
                  </legend>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#ff3d7f]"
                      checked={legalAgreed}
                      onChange={(event) => setLegalAgreed(event.target.checked)}
                    />
                    <span>
                      I agree to the{" "}
                      <Link className="font-semibold underline" href="/policies/terms">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link className="font-semibold underline" href="/policies/privacy">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#ff3d7f]"
                      checked={marketingOptIn}
                      onChange={(event) => setMarketingOptIn(event.target.checked)}
                    />
                    <span>Send me product drops and creator offers by email.</span>
                  </label>
                </fieldset>
              ) : null}
              <Button
                type="submit"
                className="h-12 rounded-full border-2 border-black bg-[#ff3d7f] font-black text-white shadow-none hover:bg-[#f72d72] hover:brightness-100"
                disabled={isSubmitting}
              >
                {copy.primaryAction}
              </Button>
            </form>
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-black/15" />
              <span className="font-brand-heavy text-xs uppercase text-muted-foreground">
                or
              </span>
              <span className="h-px flex-1 bg-black/15" />
            </div>
            <div className="grid gap-2">
              {isSignUp && !legalAgreed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-2 border-black bg-white font-black hover:bg-[#fff8f0]"
                  disabled={isSubmitting}
                  aria-label="Sign up with Google"
                  onClick={() =>
                    setMessage(
                      "Please accept the Terms and Privacy Policy to create an account."
                    )
                  }
                >
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-6 place-items-center rounded-full border border-black/15 bg-white font-brand-heavy text-sm text-[#4285f4]"
                  >
                    G
                  </span>
                  Sign up with Google
                </Button>
              ) : (
                <GoogleIdentityButton
                  mode={mode}
                  disabled={isSubmitting}
                  onCredential={signInWithGoogle}
                  onError={showGoogleError}
                />
              )}
            </div>
            {message ? (
              <p
                role="status"
                className="rounded-md border-2 border-black bg-muted p-3 text-sm leading-6"
              >
                {message}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <p className="mt-5 text-center text-sm font-semibold text-muted-foreground">
        {copy.alternateLead}{" "}
        <button
          type="button"
          className="focus-ring rounded-sm font-black text-[#ff3d7f] underline decoration-2 underline-offset-4 transition hover:text-foreground"
          onClick={() => switchMode(copy.alternateMode)}
        >
          {copy.alternateAction}
        </button>
      </p>
    </div>
  );
}
