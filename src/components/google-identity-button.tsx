"use client";

import { useEffect, useRef, useState } from "react";
import {
  createGoogleIdentityNonce,
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

  useEffect(() => {
    let isCancelled = false;
    let renderedContainer: HTMLDivElement | null = null;

    async function renderGoogleButton() {
      setIsReady(false);
      try {
        const clientId = getGoogleIdentityClientId();
        const { nonce, hashedNonce } = await createGoogleIdentityNonce();
        await loadGoogleIdentityScript();

        if (isCancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
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
          theme: "outline",
          size: "medium",
          text: mode === "sign-up" ? "signup_with" : "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(
            Math.max(renderedContainer.getBoundingClientRect().width, 240),
            400
          )
        });
        setIsReady(true);
      } catch (error) {
        if (!isCancelled) {
          onError(error instanceof Error ? error : new Error("Google sign-in failed."));
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
  }, [mode, onCredential, onError]);

  return (
    <div
      aria-label={mode === "sign-up" ? "Sign up with Google" : "Sign in with Google"}
      aria-busy={!isReady}
      className={cn(
        "flex h-[44px] w-full items-center justify-center overflow-hidden",
        (disabled || !isReady) && "pointer-events-none opacity-60"
      )}
    >
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
