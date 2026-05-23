"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/commerce";
import type { MvpCommission, MvpOrder } from "@/lib/mvp-store";

export function AdminCommissionsClient({
  commissions,
  orders
}: {
  commissions: MvpCommission[];
  orders: MvpOrder[];
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(commissionId: string, status: MvpCommission["status"]) {
    setUpdatingId(commissionId);
    try {
      await fetch(`/api/admin/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  if (commissions.length === 0) {
    return <p className="text-muted-foreground">아직 추천 커미션이 없습니다.</p>;
  }

  return (
    <div className="grid gap-3">
      {commissions.map((commission) => {
        const order = orders.find((item) => item.id === commission.orderId);
        return (
          <div
            key={commission.id}
            className="grid gap-2 rounded-md border p-3 text-sm lg:grid-cols-[repeat(6,minmax(0,1fr))_auto] lg:items-center"
          >
            <p>
              <span className="block text-muted-foreground">코드</span>
              {commission.referralCode}
              {commission.linkToken ? (
                <span className="block text-xs text-muted-foreground">
                  {commission.linkToken}
                </span>
              ) : null}
            </p>
            <p>
              <span className="block text-muted-foreground">주문</span>
              {order?.orderNumber ?? commission.orderId}
            </p>
            <p>
              <span className="block text-muted-foreground">기준 금액</span>
              {formatUsd(commission.baseCents)}
            </p>
            <p>
              <span className="block text-muted-foreground">커미션</span>
              {formatUsd(commission.amountCents)}
            </p>
            <p>
              <span className="block text-muted-foreground">상태</span>
              {getCommissionStatusLabel(commission.status)}
            </p>
            <p>
              <span className="block text-muted-foreground">Hold until</span>
              {new Date(commission.holdUntil).toLocaleDateString("en-US")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "paid", "cancelled"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={commission.status === status ? "default" : "outline"}
                  disabled={updatingId === commission.id}
                  onClick={() => updateStatus(commission.id, status)}
                >
                  {getCommissionStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getCommissionStatusLabel(status: MvpCommission["status"]) {
  const labels = {
    pending: "대기 중",
    approved: "승인됨",
    paid: "지급 완료",
    cancelled: "취소됨"
  };

  return labels[status];
}
