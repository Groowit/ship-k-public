import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { CursorSparkle } from "@/components/cursor-sparkle";
import { FloatingStickerLayer } from "@/components/floating-sticker-layer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ReferralCapture } from "@/components/referral-capture";

export const metadata: Metadata = {
  title: "shipK | Korean beauty shipped to the US",
  description: "A US-first storefront for curated Korean beauty routine kits and creator referrals."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col">
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
