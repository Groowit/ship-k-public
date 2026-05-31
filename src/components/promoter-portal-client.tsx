"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/commerce";
import type { PromoterDashboard } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

export function PromoterPortalClient({ dashboard }: { dashboard: PromoterDashboard }) {
  if (!dashboard.schemaReady) {
    return <PromoterSetupPendingCard />;
  }

  if (!dashboard.affiliate) {
    return <PromoterApplyCard />;
  }

  return <PromoterDashboardView dashboard={dashboard} />;
}

function PromoterSetupPendingCard() {
  return (
    <Card className="shipk-surface mx-auto max-w-2xl rounded-md">
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
      const payload = (await response.json()) as { error?: string };
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
    <Card className="shipk-surface mx-auto max-w-2xl rounded-md">
      <CardHeader>
        <CardTitle className="shipk-heading flex items-center gap-2 text-2xl">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Start promoting
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="flex items-start gap-3 rounded-md border-2 border-black bg-[#fff8f0] p-3 text-sm">
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
        {message ? <p className="text-sm text-destructive">{message}</p> : null}
        <Button
          type="button"
          className="shipk-btn-pop"
          onClick={apply}
          disabled={!termsAccepted || isSubmitting}
        >
          Start promoting
        </Button>
      </CardContent>
    </Card>
  );
}

function PromoterDashboardView({ dashboard }: { dashboard: PromoterDashboard }) {
  const affiliate = dashboard.affiliate;
  if (!affiliate) {
    return null;
  }
  const statusLabel = affiliate.status === "active" ? "Active" : affiliate.status;

  return (
    <div className="grid gap-6">
      <Card className="rounded-md border-2 border-black">
        <CardHeader>
          <CardTitle className="shipk-heading text-2xl">Promoter account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <p>
            <span className="block text-muted-foreground">Display name</span>
            {affiliate.displayName}
          </p>
          <p>
            <span className="block text-muted-foreground">Referral code</span>
            {affiliate.code}
          </p>
          <p>
            <span className="block text-muted-foreground">Status</span>
            {statusLabel}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Total clicks" value={dashboard.summary.totalClicks.toString()} />
        <Metric title="Unique clicks" value={dashboard.summary.uniqueClicks.toString()} />
        <Metric title="Orders" value={dashboard.summary.orders.toString()} />
        <Metric title="Sales" value={formatUsd(dashboard.summary.salesCents)} />
        <Metric
          title="Pending commission"
          value={formatUsd(dashboard.summary.pendingCommissionCents)}
        />
        <Metric
          title="Approved / paid"
          value={`${formatUsd(dashboard.summary.approvedCommissionCents)} / ${formatUsd(
            dashboard.summary.paidCommissionCents
          )}`}
        />
      </div>

      <Card className="rounded-md border-2 border-black">
        <CardHeader>
          <CardTitle className="shipk-heading text-2xl">Product links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {dashboard.links.map((link) => (
              <PromoterLinkRow key={link.id} link={link} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md border-2 border-black">
        <CardHeader>
          <CardTitle className="shipk-heading text-2xl">Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commissions in this period.</p>
          ) : (
            <div className="grid gap-3">
              {dashboard.commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="grid gap-2 rounded-md border-2 border-black p-3 text-sm md:grid-cols-6"
                >
                  <p>
                    <span className="block text-muted-foreground">Order</span>
                    {commission.orderNumber}
                  </p>
                  <p className="md:col-span-2">
                    <span className="block text-muted-foreground">Product</span>
                    {commission.productName}
                  </p>
                  <p>
                    <span className="block text-muted-foreground">Base</span>
                    {formatUsd(commission.baseCents)}
                  </p>
                  <p>
                    <span className="block text-muted-foreground">Commission</span>
                    {formatUsd(commission.amountCents)}
                  </p>
                  <p>
                    <span className="block text-muted-foreground">Status</span>
                    {commission.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PromoterLinkRow({ link }: { link: PromoterDashboard["links"][number] }) {
  const [copied, setCopied] = useState(false);
  const absoluteLink = useMemo(() => {
    if (typeof window === "undefined") {
      return link.referralPath;
    }
    return `${window.location.origin}${link.referralPath}`;
  }, [link.referralPath]);
  const conversionRate =
    link.totalClicks > 0 ? `${Math.round((link.orders / link.totalClicks) * 100)}%` : "0%";

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="grid gap-3 rounded-md border-2 border-black bg-white p-3 text-sm lg:grid-cols-[1.5fr_2fr_repeat(5,minmax(0,0.8fr))_auto] lg:items-center">
      <p>
        <span className="block text-muted-foreground">Product</span>
        {link.productName}
      </p>
      <p className="break-all">
        <span className="block text-muted-foreground">Link</span>
        {link.referralPath}
      </p>
      <p>
        <span className="block text-muted-foreground">Clicks</span>
        {link.totalClicks}
      </p>
      <p>
        <span className="block text-muted-foreground">Unique</span>
        {link.uniqueClicks}
      </p>
      <p>
        <span className="block text-muted-foreground">Orders</span>
        {link.orders}
      </p>
      <p>
        <span className="block text-muted-foreground">CVR</span>
        {conversionRate}
      </p>
      <p>
        <span className="block text-muted-foreground">Commission</span>
        {formatUsd(link.commissionCents)}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="border-2 border-black font-black"
          onClick={copyLink}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Link
          href={link.referralPath}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-md border-2 border-black bg-[#fff8f0]">
      <CardHeader>
        <CardTitle className="font-brand-heavy text-sm uppercase text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="shipk-heading text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}
