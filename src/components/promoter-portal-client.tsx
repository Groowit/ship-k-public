"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Copy,
  DollarSign,
  Link2,
  MousePointerClick,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/commerce";
import type { CommerceCommission, PromoterDashboard } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

type PromoterLink = PromoterDashboard["links"][number];
type PromoterCommission = PromoterDashboard["commissions"][number];
type PromoterAffiliate = NonNullable<PromoterDashboard["affiliate"]>;
type PromoterAffiliateStatus = PromoterAffiliate["status"];
type LinkSort = "featured" | "commission" | "orders" | "clicks" | "product";
export type PromoterWorkspaceView = "links" | "commissions";
type CommissionFilter = "all" | "unpaid" | "paid" | "excluded";

const linkPageSize = 6;

const linkSortOptions: Array<{ value: LinkSort; label: string }> = [
  { value: "featured", label: "Best overall" },
  { value: "commission", label: "Commission" },
  { value: "orders", label: "Orders" },
  { value: "clicks", label: "Clicks" },
  { value: "product", label: "Product name" }
];

const commissionFilterOptions: Array<{ value: CommissionFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "excluded", label: "Excluded" }
];

export function PromoterPortalClient({
  dashboard,
  initialView = "links"
}: {
  dashboard: PromoterDashboard;
  initialView?: PromoterWorkspaceView;
}) {
  if (!dashboard.schemaReady) {
    return <PromoterSetupPendingCard />;
  }

  if (!dashboard.affiliate) {
    return <PromoterApplyCard />;
  }

  return (
    <PromoterDashboardView
      affiliate={dashboard.affiliate}
      dashboard={dashboard}
      activeView={initialView}
    />
  );
}

function PromoterSetupPendingCard() {
  return (
    <Card className="mx-auto max-w-2xl rounded-md border-neutral-200">
      <CardHeader>
        <CardTitle className="shipk-heading text-2xl">Promoter setup pending</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The promoter database migration has not finished yet. Product links and
          applications will be available as soon as the latest Supabase migration is
          applied.
        </p>
      </CardContent>
    </Card>
  );
}

function PromoterApplyCard() {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function apply() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/promoter/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ termsAccepted })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not start promoter account");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start promoter account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl rounded-md border-neutral-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Start promoting
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Create product links, share them with customers, and track attributed orders
          from this workspace. Payouts remain manually reviewed by shipK operations.
        </p>
        <label className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
          />
          <span>
            I agree to the shipK Affiliate Terms, including commission review,
            prohibited self-purchases, and manual payout processing.
          </span>
        </label>
        {message ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={apply}
          disabled={!termsAccepted || isSubmitting}
        >
          {isSubmitting ? "Starting..." : "Start promoting"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PromoterDashboardView({
  activeView,
  affiliate,
  dashboard
}: {
  activeView: PromoterWorkspaceView;
  affiliate: PromoterAffiliate;
  dashboard: PromoterDashboard;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LinkSort>("featured");
  const [visibleLinkCount, setVisibleLinkCount] = useState(linkPageSize);
  const [commissionQuery, setCommissionQuery] = useState("");
  const [commissionFilter, setCommissionFilter] = useState<CommissionFilter>("all");
  const unpaidCommissionCents =
    dashboard.summary.pendingCommissionCents + dashboard.summary.approvedCommissionCents;
  const matchingLinks = useMemo(
    () => sortPromoterLinks(filterPromoterLinks(dashboard.links, query), sort),
    [dashboard.links, query, sort]
  );
  const pagedLinks = matchingLinks.slice(0, visibleLinkCount);
  const matchingCommissions = useMemo(
    () => filterCommissions(dashboard.commissions, commissionQuery, commissionFilter),
    [commissionFilter, commissionQuery, dashboard.commissions]
  );

  function changeQuery(value: string) {
    setQuery(value);
    setVisibleLinkCount(linkPageSize);
  }

  function changeSort(value: LinkSort) {
    setSort(value);
    setVisibleLinkCount(linkPageSize);
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-neutral-200 bg-white">
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{affiliate.displayName}</h2>
              <AffiliateStatusBadge status={affiliate.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Your referral code: <span className="font-semibold text-foreground">{affiliate.code}</span>
            </p>
          </div>
          {affiliate.status === "active" ? (
            <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-muted-foreground">
              Links are active. Copy a product link and share it with customers.
            </p>
          ) : (
            <p className="rounded-md border border-destructive bg-white px-3 py-2 text-sm text-destructive">
              Your account is {affiliate.status}. Existing performance remains visible.
            </p>
          )}
        </div>
        <div className="grid border-t border-neutral-200 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-neutral-200">
          <Metric
            icon={<MousePointerClick className="h-4 w-4" aria-hidden="true" />}
            title="Clicks"
            value={dashboard.summary.totalClicks.toString()}
            caption={`${dashboard.summary.uniqueClicks} unique`}
          />
          <Metric
            icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />}
            title="Orders"
            value={dashboard.summary.orders.toString()}
            caption="Attributed orders"
          />
          <Metric
            icon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
            title="Sales"
            value={formatUsd(dashboard.summary.salesCents)}
            caption="Subtotal tracked"
          />
          <Metric
            icon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
            title="Unpaid commission"
            value={formatUsd(unpaidCommissionCents)}
            caption="Pending review or payout"
          />
          <Metric
            icon={<Check className="h-4 w-4" aria-hidden="true" />}
            title="Paid commission"
            value={formatUsd(dashboard.summary.paidCommissionCents)}
            caption="Completed by operations"
          />
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 bg-white">
        <WorkspaceTabs
          activeView={activeView}
          commissionCount={dashboard.commissions.length}
          linkCount={dashboard.links.length}
          range={dashboard.range}
          unpaidCommissionCents={unpaidCommissionCents}
        />
        {activeView === "links" ? (
          <ProductLinksPanel
            links={dashboard.links}
            matchingLinks={matchingLinks}
            pagedLinks={pagedLinks}
            query={query}
            sort={sort}
            visibleLinkCount={visibleLinkCount}
            onQueryChange={changeQuery}
            onShowMore={() => setVisibleLinkCount((count) => count + linkPageSize)}
            onSortChange={changeSort}
          />
        ) : (
          <CommissionsPanel
            commissions={dashboard.commissions}
            filteredCommissions={matchingCommissions}
            filter={commissionFilter}
            query={commissionQuery}
            onFilterChange={setCommissionFilter}
            onQueryChange={setCommissionQuery}
          />
        )}
      </section>
    </div>
  );
}

function WorkspaceTabs({
  activeView,
  commissionCount,
  linkCount,
  range,
  unpaidCommissionCents
}: {
  activeView: PromoterWorkspaceView;
  commissionCount: number;
  linkCount: number;
  range: PromoterDashboard["range"];
  unpaidCommissionCents: number;
}) {
  return (
    <div className="grid gap-3 border-b border-neutral-200 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Promoter workspace">
        <WorkspaceTab
          active={activeView === "links"}
          href={`/promoter?range=${range}&view=links`}
          icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
          label="Product links"
          meta={`${linkCount} links`}
        />
        <WorkspaceTab
          active={activeView === "commissions"}
          href={`/promoter?range=${range}&view=commissions`}
          icon={<ReceiptText className="h-4 w-4" aria-hidden="true" />}
          label="Commissions"
          meta={`${commissionCount} rows`}
        />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">
        Unpaid {formatUsd(unpaidCommissionCents)}
      </p>
    </div>
  );
}

function WorkspaceTab({
  active,
  href,
  icon,
  label,
  meta
}: {
  active: boolean;
  href: string;
  icon: ReactNode;
  label: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "focus-ring inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-xs",
          active ? "bg-white/20 text-primary-foreground" : "bg-neutral-100 text-muted-foreground"
        )}
      >
        {meta}
      </span>
    </Link>
  );
}

function ProductLinksPanel({
  links,
  matchingLinks,
  pagedLinks,
  query,
  sort,
  visibleLinkCount,
  onQueryChange,
  onShowMore,
  onSortChange
}: {
  links: PromoterLink[];
  matchingLinks: PromoterLink[];
  pagedLinks: PromoterLink[];
  query: string;
  sort: LinkSort;
  visibleLinkCount: number;
  onQueryChange: (query: string) => void;
  onShowMore: () => void;
  onSortChange: (sort: LinkSort) => void;
}) {
  const shownCount = Math.min(visibleLinkCount, matchingLinks.length);

  return (
    <div id="product-links-panel" role="tabpanel" className="grid gap-3 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
        <div>
          <h2 className="text-xl font-bold">Product links</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing {shownCount} of {matchingLinks.length} matching links
          </p>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          Sort
          <select
            aria-label="Sort product links"
            className="focus-ring h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as LinkSort)}
          >
            {linkSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="relative lg:col-span-2">
          <span className="sr-only">Search product links</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="border-neutral-200 pl-9"
            placeholder="Search products or links"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>
      {links.length === 0 ? (
        <EmptyState
          title="No product links yet"
          body="Product links will appear here once active products are available."
        />
      ) : matchingLinks.length === 0 ? (
        <EmptyState
          title="No matching links"
          body="Try another product name or clear the search field."
        />
      ) : (
        <>
          <div className="grid gap-3">
            {pagedLinks.map((link) => <PromoterLinkRow key={link.id} link={link} />)}
          </div>
          {matchingLinks.length > shownCount ? (
            <Button type="button" variant="outline" onClick={onShowMore}>
              Show more links
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function CommissionsPanel({
  commissions,
  filteredCommissions,
  filter,
  query,
  onFilterChange,
  onQueryChange
}: {
  commissions: PromoterCommission[];
  filteredCommissions: PromoterCommission[];
  filter: CommissionFilter;
  query: string;
  onFilterChange: (filter: CommissionFilter) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div id="commissions-panel" role="tabpanel" className="grid gap-3 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
        <div>
          <h2 className="text-xl font-bold">Commissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing {filteredCommissions.length} of {commissions.length} commission rows
          </p>
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          Status
          <select
            aria-label="Filter commissions by status"
            className="focus-ring h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as CommissionFilter)}
          >
            {commissionFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="relative lg:col-span-2">
          <span className="sr-only">Search commissions</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="border-neutral-200 pl-9"
            placeholder="Search orders, products, or link tokens"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>
      {commissions.length === 0 ? (
        <EmptyState
          title="No commissions in this period"
          body="Commission rows appear after customers purchase through your product links."
        />
      ) : filteredCommissions.length === 0 ? (
        <EmptyState
          title="No matching commissions"
          body="Try another order, product, link token, or status."
        />
      ) : (
        <CommissionTable commissions={filteredCommissions} />
      )}
    </div>
  );
}

function PromoterLinkRow({ link }: { link: PromoterLink }) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const absoluteLink = useMemo(() => {
    if (typeof window === "undefined") {
      return link.referralPath;
    }
    return `${window.location.origin}${link.referralPath}`;
  }, [link.referralPath]);

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not available in this browser.");
      }
      await navigator.clipboard.writeText(absoluteLink);
      setCopyState("success");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <article
      className="grid gap-3 rounded-md border border-neutral-200 bg-white p-3 lg:grid-cols-[minmax(220px,1.6fr)_minmax(280px,2fr)_auto] lg:items-center"
      data-testid={`promoter-link-${link.id}`}
    >
      <div className="min-w-0">
        <p className="font-semibold">{link.productName}</p>
        <p className="mt-1 text-xs text-muted-foreground">Token {link.linkToken}</p>
      </div>
      <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Product link
        </div>
        <code className="block truncate text-xs text-foreground">{link.referralPath}</code>
      </div>
      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
        <Button type="button" size="sm" onClick={copyLink}>
          {copyState === "success" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copyState === "success" ? "Copied" : "Copy link"}
        </Button>
        <Link
          href={link.referralPath}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
          aria-label={`Open ${link.productName} referral link`}
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          Open
        </Link>
      </div>
      <div className="grid gap-2 border-t border-neutral-200 pt-3 text-sm sm:grid-cols-3 lg:col-span-3 lg:grid-cols-6">
        <SmallMetric title="Clicks" value={link.totalClicks.toString()} />
        <SmallMetric title="Unique" value={link.uniqueClicks.toString()} />
        <SmallMetric title="Orders" value={link.orders.toString()} />
        <SmallMetric title="CVR" value={getConversionRate(link)} />
        <SmallMetric title="Sales" value={formatUsd(link.salesCents)} />
        <SmallMetric title="Commission" value={formatUsd(link.commissionCents)} />
      </div>
      {copyState === "error" ? (
        <p className="flex items-center gap-2 text-sm text-destructive lg:col-span-3" role="status">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          Copy failed. Select the product link and copy it manually.
        </p>
      ) : null}
    </article>
  );
}

function CommissionTable({ commissions }: { commissions: PromoterCommission[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Order</th>
            <th scope="col" className="px-4 py-3 font-semibold">Product</th>
            <th scope="col" className="px-4 py-3 font-semibold">Link token</th>
            <th scope="col" className="px-4 py-3 font-semibold">Sales base</th>
            <th scope="col" className="px-4 py-3 font-semibold">Commission</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {commissions.map((commission) => (
            <tr key={commission.id} data-testid={`promoter-commission-${commission.id}`}>
              <td className="px-4 py-3 font-semibold">{commission.orderNumber}</td>
              <td className="max-w-[260px] truncate px-4 py-3 font-semibold">
                {commission.productName}
              </td>
              <td className="px-4 py-3">{commission.linkToken ?? "-"}</td>
              <td className="px-4 py-3">{formatUsd(commission.baseCents)}</td>
              <td className="px-4 py-3 font-semibold">{formatUsd(commission.amountCents)}</td>
              <td className="px-4 py-3">
                <CommissionStatusBadge status={commission.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({
  icon,
  title,
  value,
  caption
}: {
  icon: ReactNode;
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="border-b border-neutral-200 p-4 last:border-b-0 sm:[&:nth-child(4)]:border-b-0 sm:[&:nth-child(5)]:border-b-0 lg:border-b-0">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function SmallMetric({ title, value }: { title: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="block text-xs text-muted-foreground">{title}</span>
      <span className="block truncate font-semibold">{value}</span>
    </p>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}

function AffiliateStatusBadge({ status }: { status: PromoterAffiliateStatus }) {
  const className = {
    active: "bg-[#bbf7d0] text-black",
    paused: "bg-[#fff3a3] text-black",
    blocked: "bg-destructive text-destructive-foreground"
  }[status] ?? "bg-muted text-muted-foreground";

  return <Badge className={className}>{capitalizeStatus(status)}</Badge>;
}

function CommissionStatusBadge({ status }: { status: CommerceCommission["status"] }) {
  const className = {
    pending: "bg-[#fff3a3] text-black",
    approved: "bg-[#fff3a3] text-black",
    paid: "bg-[#bbf7d0] text-black",
    cancelled: "bg-muted text-muted-foreground"
  }[status];

  return <Badge className={className}>{getCommissionStatusLabel(status)}</Badge>;
}

function filterPromoterLinks(links: PromoterLink[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return links;
  }

  return links.filter((link) =>
    [link.productName, link.productSlug, link.linkToken, link.referralPath].some((value) =>
      normalizeSearchText(value).includes(normalizedQuery)
    )
  );
}

function sortPromoterLinks(links: PromoterLink[], sort: LinkSort) {
  return [...links].sort((first, second) => {
    if (sort === "product") {
      return first.productName.localeCompare(second.productName);
    }
    if (sort === "commission") {
      return second.commissionCents - first.commissionCents;
    }
    if (sort === "orders") {
      return second.orders - first.orders;
    }
    if (sort === "clicks") {
      return second.totalClicks - first.totalClicks;
    }
    const firstScore = first.orders * 10000 + first.commissionCents + first.totalClicks;
    const secondScore = second.orders * 10000 + second.commissionCents + second.totalClicks;
    return secondScore - firstScore || first.productName.localeCompare(second.productName);
  });
}

function filterCommissions(
  commissions: PromoterCommission[],
  query: string,
  filter: CommissionFilter
) {
  const normalizedQuery = normalizeSearchText(query);

  return commissions.filter((commission) => {
    const matchesStatus =
      filter === "all" || getCommissionBucket(commission.status) === filter;
    const matchesQuery =
      !normalizedQuery ||
      [
        commission.orderNumber,
        commission.productName,
        commission.linkToken ?? "",
        getCommissionStatusLabel(commission.status)
      ].some((value) => normalizeSearchText(value).includes(normalizedQuery));

    return matchesStatus && matchesQuery;
  });
}

function getConversionRate(link: PromoterLink) {
  return link.totalClicks > 0 ? `${Math.round((link.orders / link.totalClicks) * 100)}%` : "0%";
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getCommissionStatusLabel(status: CommerceCommission["status"]) {
  const labels = {
    pending: "Unpaid",
    approved: "Unpaid",
    paid: "Paid",
    cancelled: "Excluded"
  };
  return labels[status];
}

function getCommissionBucket(status: CommerceCommission["status"]): Exclude<CommissionFilter, "all"> {
  if (status === "paid") {
    return "paid";
  }
  if (status === "cancelled") {
    return "excluded";
  }
  return "unpaid";
}

function capitalizeStatus(status: string) {
  return `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}
