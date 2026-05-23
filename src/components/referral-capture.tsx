"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ReferralCapture() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const link = searchParams.get("link");

  useEffect(() => {
    if (!ref || !link || !window.location.pathname.startsWith("/products/")) {
      return;
    }
    const anonymousId = getOrCreateAnonymousId();
    const payload = {
      referralCode: ref,
      linkToken: link,
      landingPath: window.location.pathname,
      anonymousId
    };

    window.localStorage.setItem("shipk_ref_hint", JSON.stringify(payload));
    document.cookie = `shipk_ref_hint=${encodeURIComponent(ref)}; path=/; max-age=${60 * 60 * 48}; samesite=lax`;

    void fetch("/api/referrals/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => undefined);
  }, [ref, link]);

  return null;
}

function getOrCreateAnonymousId() {
  const key = "shipk_ref_anon";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  window.localStorage.setItem(key, next);
  return next;
}
