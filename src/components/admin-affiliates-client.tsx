"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/commerce";
import type { AdminAffiliateSummary, AffiliateStatus } from "@/lib/commerce-store";

export function AdminAffiliatesClient({
  affiliates
}: {
  affiliates: AdminAffiliateSummary[];
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(affiliateId: string, status: AffiliateStatus) {
    setUpdatingId(affiliateId);
    try {
      await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  if (affiliates.length === 0) {
    return <p className="text-muted-foreground">아직 홍보자가 없습니다.</p>;
  }

  return (
    <div className="grid gap-3">
      {affiliates.map((affiliate) => (
        <div
          key={affiliate.id}
          className="grid gap-3 rounded-md border p-3 text-sm lg:grid-cols-[1.4fr_1fr_repeat(4,minmax(0,0.7fr))_auto] lg:items-center"
        >
          <p>
            <span className="block text-muted-foreground">홍보자</span>
            {affiliate.displayName}
            <span className="block text-xs text-muted-foreground">
              {affiliate.email ?? affiliate.profileId ?? "No profile"}
            </span>
          </p>
          <p>
            <span className="block text-muted-foreground">코드</span>
            {affiliate.code}
          </p>
          <p>
            <span className="block text-muted-foreground">상태</span>
            {affiliate.status}
          </p>
          <p>
            <span className="block text-muted-foreground">클릭</span>
            {affiliate.totalClicks} / {affiliate.uniqueClicks}
          </p>
          <p>
            <span className="block text-muted-foreground">주문</span>
            {affiliate.orders}
          </p>
          <p>
            <span className="block text-muted-foreground">커미션</span>
            {formatUsd(affiliate.commissionCents)}
          </p>
          <div className="flex flex-wrap gap-2">
            {(["active", "paused", "blocked"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={affiliate.status === status ? "default" : "outline"}
                disabled={updatingId === affiliate.id}
                onClick={() => updateStatus(affiliate.id, status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
