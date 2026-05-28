import Link from "next/link";
import { redirect } from "next/navigation";
import { PromoterPortalClient } from "@/components/promoter-portal-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { getPromoterDashboard, PromoterDateRange } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const allowedRanges: PromoterDateRange[] = ["7d", "30d", "all"];

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
  const dashboard = await getPromoterDashboard({ userId: user.id, range });

  return (
    <section className="container py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
            Promoter
          </p>
          <h1 className="mt-2 shipk-heading text-5xl">
            Product-link dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Copy shipK product links and track attributed clicks, orders, sales, and
            commissions.
          </p>
        </div>
        {dashboard.affiliate ? (
          <nav className="flex flex-wrap gap-2 text-sm font-semibold" aria-label="Date range">
            <RangeLink href="/promoter?range=7d" active={range === "7d"}>
              Last 7 days
            </RangeLink>
            <RangeLink href="/promoter?range=30d" active={range === "30d"}>
              Last 30 days
            </RangeLink>
            <RangeLink href="/promoter?range=all" active={range === "all"}>
              All time
            </RangeLink>
          </nav>
        ) : null}
      </div>
      <PromoterPortalClient dashboard={dashboard} />
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
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
        active ? "shipk-btn-pop" : "border-2 border-black bg-white font-black",
        "shrink-0"
      )}
    >
      {children}
    </Link>
  );
}
