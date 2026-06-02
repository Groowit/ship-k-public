import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  PromoterPortalClient,
  type PromoterWorkspaceView
} from "@/components/promoter-portal-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { getPromoterDashboard, PromoterDateRange } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const allowedRanges: PromoterDateRange[] = ["7d", "30d", "all"];
const allowedViews: PromoterWorkspaceView[] = ["links", "commissions"];

export default async function PromoterPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/promoter"));
  }

  const params = await searchParams;
  const rangeParam = typeof params.range === "string" ? params.range : "30d";
  const range = allowedRanges.includes(rangeParam as PromoterDateRange)
    ? (rangeParam as PromoterDateRange)
    : "30d";
  const viewParam = typeof params.view === "string" ? params.view : "links";
  const view = allowedViews.includes(viewParam as PromoterWorkspaceView)
    ? (viewParam as PromoterWorkspaceView)
    : "links";
  const dashboard = await getPromoterDashboard({ userId: user.id, range });

  return (
    <section className="container py-8">
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-brand-heavy text-xs uppercase tracking-normal text-[#ff3d7f]">
            Seller tools
          </p>
          <h1 className="mt-2 shipk-heading text-4xl">Promoter workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Copy product links, monitor attributed orders, and track manual payout
            progress in one place.
          </p>
        </div>
        {dashboard.affiliate ? (
          <nav className="flex flex-wrap gap-2 text-sm font-semibold" aria-label="Date range">
            <RangeLink href={`/promoter?range=7d&view=${view}`} active={range === "7d"}>
              7 days
            </RangeLink>
            <RangeLink href={`/promoter?range=30d&view=${view}`} active={range === "30d"}>
              30 days
            </RangeLink>
            <RangeLink href={`/promoter?range=all&view=${view}`} active={range === "all"}>
              All time
            </RangeLink>
          </nav>
        ) : null}
      </div>
      <PromoterPortalClient dashboard={dashboard} initialView={view} />
    </section>
  );
}

function RangeLink({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
        active ? "" : "border-neutral-200 bg-white",
        "shrink-0"
      )}
    >
      {children}
    </Link>
  );
}
