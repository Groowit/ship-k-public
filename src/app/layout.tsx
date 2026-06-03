import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { CursorSparkle } from "@/components/cursor-sparkle";
import { FloatingStickerLayer } from "@/components/floating-sticker-layer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ReferralCapture } from "@/components/referral-capture";
import {
  GOOGLE_IDENTITY_SCRIPT_ID,
  GOOGLE_IDENTITY_SCRIPT_SRC
} from "@/lib/google-identity";

export const metadata: Metadata = {
  title: "shipK | Korean beauty shipped to the US",
  description: "A US-first storefront for Korean beauty sets, single products, and creator referrals.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48 64x64", type: "image/x-icon" },
      { url: "/shipk-brand/favicon/cherry-32.png", sizes: "32x32", type: "image/png" },
      { url: "/shipk-brand/favicon/cherry-48.png", sizes: "48x48", type: "image/png" }
    ],
    apple: [
      { url: "/shipk-brand/favicon/cherry-180.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shouldPreloadGoogleIdentity = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  );

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col">
        {shouldPreloadGoogleIdentity ? (
          <Script
            id={GOOGLE_IDENTITY_SCRIPT_ID}
            src={GOOGLE_IDENTITY_SCRIPT_SRC}
            strategy="beforeInteractive"
          />
        ) : null}
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <CursorSparkle />
        <SiteHeader />
        <main className="relative flex-1 overflow-x-clip">
          <FloatingStickerLayer />
          <div className="relative z-10">{children}</div>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
