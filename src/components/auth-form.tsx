"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
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
import { cn } from "@/lib/utils";

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
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const safeNextPath = getSafeNextPath(nextPath);
  const isSignUp = mode === "sign-up";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
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

      setMessage("Check your inbox to confirm your account.");
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
    <Card className="shipk-surface mx-auto max-w-md rounded-md">
      <CardHeader>
        <CardTitle className="shipk-heading text-2xl">
          {isSignUp ? "Create your shipK account" : "Sign in to shipK"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div
            className="grid grid-cols-2 rounded-md border-2 border-black bg-muted p-1"
            aria-label="Account access mode"
          >
            <button
              type="button"
              aria-label="Switch to sign in"
              aria-pressed={!isSignUp}
              className={cn(
                "rounded px-3 py-2 text-sm font-black transition",
                !isSignUp
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => switchMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-label="Switch to create account"
              aria-pressed={isSignUp}
              className={cn(
                "rounded px-3 py-2 text-sm font-black transition",
                isSignUp
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => switchMode("sign-up")}
            >
              Create account
            </button>
          </div>
          <div>
            <Label className="font-black">Email</Label>
            <Input
              className="mt-2"
              aria-label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label className="font-black">Password</Label>
            <Input
              className="mt-2"
              aria-label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>
          {isSignUp ? (
            <div className="grid gap-3 rounded-md border-2 border-black bg-[#fff8f0] p-3 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
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
                  className="mt-1 h-4 w-4"
                  checked={marketingOptIn}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                />
                <span>Send me product drops and creator offers by email.</span>
              </label>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Button
              type="button"
              className="shipk-btn-pop"
              onClick={signInWithPassword}
              disabled={isSubmitting}
            >
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
            {isSignUp && !legalAgreed ? (
              <Button
                type="button"
                variant="secondary"
                className="border-2 border-black font-black"
                disabled={isSubmitting}
                onClick={() =>
                  setMessage(
                    "Please accept the Terms and Privacy Policy to create an account."
                  )
                }
              >
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
            <p role="status" className="rounded-md border-2 border-black bg-muted p-3 text-sm">
              {message}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
