"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  createGoogleIdentityNonce,
  getGoogleIdentityClientIdFromEnvironment,
  getGoogleIdentityClientId,
  loadGoogleIdentityScript,
  type GoogleCredentialResponse
} from "@/lib/google-identity";
import { cn } from "@/lib/utils";

type GoogleIdentityButtonProps = {
  mode: "sign-in" | "sign-up";
  disabled?: boolean;
  onCredential: (response: GoogleCredentialResponse, nonce: string) => void;
  onError: (error: Error) => void;
};

export function GoogleIdentityButton({
  mode,
  disabled = false,
  onCredential,
  onError
}: GoogleIdentityButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasAttemptedSetup, setHasAttemptedSetup] = useState(false);
  const [setupError, setSetupError] = useState<Error | null>(null);
  const hasConfiguredClientId = Boolean(getGoogleIdentityClientIdFromEnvironment());
  const label = mode === "sign-up" ? "Sign up with Google" : "Sign in with Google";

  useLayoutEffect(() => {
    let isCancelled = false;
    let renderedContainer: HTMLDivElement | null = null;

    async function renderGoogleButton() {
      setIsReady(false);
      setHasAttemptedSetup(false);
      setSetupError(null);
      try {
        const clientId = getGoogleIdentityClientId();
        const { nonce, hashedNonce } = await createGoogleIdentityNonce();
        await loadGoogleIdentityScript();

        if (isCancelled || !containerRef.current) {
          return;
        }

        if (!window.google?.accounts?.id) {
          throw new Error("Google sign-in is unavailable right now.");
        }

        renderedContainer = containerRef.current;
        renderedContainer.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          callback: (response) => onCredential(response, nonce)
        });
        window.google.accounts.id.renderButton(renderedContainer, {
          type: "standard",
          theme: "filled_black",
          size: "medium",
          text: mode === "sign-up" ? "signup_with" : "signin_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(
            Math.max(renderedContainer.getBoundingClientRect().width, 240),
            400
          )
        });
        setIsReady(true);
      } catch (error) {
        if (!isCancelled) {
          setHasAttemptedSetup(true);
          setSetupError(
            error instanceof Error ? error : new Error("Google sign-in failed.")
          );
        }
      }
    }

    renderGoogleButton();

    return () => {
      isCancelled = true;
      if (renderedContainer) {
        renderedContainer.innerHTML = "";
      }
    };
  }, [mode, onCredential]);

  return (
    <div className="relative min-h-[44px] w-full">
      <div
        aria-label={label}
        aria-busy={!isReady}
        className={cn(
          "flex h-[44px] w-full items-center justify-center overflow-hidden transition-opacity",
          isReady ? "opacity-100" : "pointer-events-none opacity-0",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <div ref={containerRef} className="w-full" />
      </div>
      {!isReady && (!hasConfiguredClientId || hasAttemptedSetup) ? (
        <button
          type="button"
          className="focus-ring absolute inset-0 flex h-11 w-full items-center justify-center gap-3 rounded-full border-2 border-black bg-white px-4 text-sm font-black text-foreground transition hover:bg-[#fff8f0] disabled:pointer-events-none disabled:opacity-60"
          disabled={disabled}
          aria-label={label}
          onClick={() =>
            onError(
              setupError ??
                new Error("Google sign-in is still loading. Please try again in a moment.")
            )
          }
        >
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-full border border-black/15 bg-white font-brand-heavy text-sm text-[#4285f4]"
          >
            G
          </span>
          {label}
        </button>
      ) : null}
    </div>
  );
}
