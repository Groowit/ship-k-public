"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/commerce";
import type {
  AdminCommissionDetail,
  AdminCommissionSettlement,
  CommerceCommission
} from "@/lib/commerce-store";

type StatusFilter = "all" | "unpaid" | "paid" | "cancelled";
type CommissionActionStatus = "paid" | "cancelled";

const statusFilters: StatusFilter[] = ["all", "unpaid", "paid", "cancelled"];

export function AdminCommissionsClient({
  settlements
}: {
  settlements: AdminCommissionSettlement[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => summarizeSettlements(settlements), [settlements]);
  const visibleSettlements = useMemo(
    () =>
      settlements.filter(
        (settlement) =>
          matchesSettlementQuery(settlement, query) &&
          matchesSettlementStatus(settlement, statusFilter)
      ),
    [settlements, query, statusFilter]
  );

  async function updateStatus(
    commissionId: string,
    status: CommerceCommission["status"],
    requiresConfirmation = false
  ) {
    if (
      requiresConfirmation &&
      !window.confirm(getCommissionActionConfirmMessage(status))
    ) {
      return;
    }
    setUpdatingId(commissionId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          typeof body?.error === "string" ? body.error : "커미션 상태를 변경하지 못했습니다."
        );
      }
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "커미션 상태를 변경하지 못했습니다."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function payUnpaidSettlement(settlement: AdminCommissionSettlement) {
    const unpaidCommissions = getUnpaidCommissions(settlement);
    if (unpaidCommissions.length === 0) {
      return;
    }
    if (!window.confirm(getSettlementPayConfirmMessage(settlement, unpaidCommissions.length))) {
      return;
    }

    const updateKey = getSettlementUpdateId(settlement.affiliateId);
    setUpdatingId(updateKey);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/commissions/settlements/${encodeURIComponent(settlement.affiliateId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "paid" })
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          typeof body?.error === "string" ? body.error : "홍보자 미정산 커미션을 처리하지 못했습니다."
        );
      }
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "홍보자 미정산 커미션을 처리하지 못했습니다."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (settlements.length === 0) {
    return (
      <div className="rounded-md border p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">정산할 홍보자 커미션이 없습니다.</p>
        <p className="mt-1">추천 주문이 발생하면 홍보자별로 정산 내역이 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid overflow-hidden rounded-md border bg-white sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        <SettlementMetric title="총 정산액" value={formatUsd(totals.totalCommissionCents)} />
        <SettlementMetric title="미정산" value={formatUsd(totals.unpaidCommissionCents)} />
        <SettlementMetric title="지급 완료" value={formatUsd(totals.paidCommissionCents)} />
        <SettlementMetric title="제외됨" value={formatUsd(totals.cancelledCommissionCents)} />
      </div>

      <div className="rounded-md border p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <label className="grid gap-1 text-sm font-semibold">
            정산 검색
            <span className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="정산 검색"
                className="pl-9"
                placeholder="홍보자, 이메일, 주문번호, 상품, 링크 토큰"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            상태 필터
            <select
              aria-label="상태 필터"
              className="focus-ring h-11 rounded-md border bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {getStatusFilterLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{visibleSettlements.length}명 표시 중</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive bg-white p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {visibleSettlements.length === 0 ? (
        <div className="rounded-md border p-5 text-sm text-muted-foreground">
          조건에 맞는 홍보자 정산 내역이 없습니다.
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleSettlements.map((settlement) => {
            const expanded = expandedId === settlement.affiliateId;
            const detailId = `settlement-detail-${settlement.affiliateId}`;
            const unpaidCommissionCount = getUnpaidCommissions(settlement).length;
            const settlementUpdateId = getSettlementUpdateId(settlement.affiliateId);
            const settlementUpdating = updatingId === settlementUpdateId;
            return (
              <section
                key={settlement.affiliateId}
                className="overflow-hidden rounded-md border bg-white"
                data-testid={`settlement-row-${settlement.affiliateId}`}
              >
                <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <button
                    type="button"
                    className="focus-ring flex min-w-0 items-center gap-3 rounded-md text-left"
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    onClick={() => setExpandedId(expanded ? null : settlement.affiliateId)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-5 w-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{settlement.displayName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {settlement.email ?? settlement.profileId ?? "프로필 없음"}
                      </span>
                      <span className="mt-1 block">
                        <AffiliateStatusBadge status={settlement.status} />
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
                    {unpaidCommissionCount > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full shrink-0 md:w-auto"
                        disabled={updatingId !== null}
                        onClick={() => payUnpaidSettlement(settlement)}
                      >
                        {settlementUpdating
                          ? "처리 중"
                          : `미정산 ${unpaidCommissionCount}건 지급 완료`}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full shrink-0 md:w-auto"
                      aria-expanded={expanded}
                      aria-controls={detailId}
                      onClick={() => setExpandedId(expanded ? null : settlement.affiliateId)}
                    >
                      {expanded ? "접기" : "상세 보기"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 border-t bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-6">
                  <RowMetric title="커미션" value={`${settlement.commissionCount}건`} />
                  <RowMetric title="주문" value={`${settlement.orders}건`} />
                  <RowMetric title="매출 기준액" value={formatUsd(settlement.salesBaseCents)} />
                  <RowMetric title="미정산" value={formatUsd(settlement.unpaidCommissionCents)} />
                  <RowMetric title="지급 완료" value={formatUsd(settlement.paidCommissionCents)} />
                  <RowMetric title="제외됨" value={formatUsd(settlement.cancelledCommissionCents)} />
                </div>

                {expanded ? (
                  <div id={detailId} className="border-t bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-left text-sm">
                        <caption className="sr-only">
                          {settlement.displayName} 커미션 {settlement.commissionCount}개
                        </caption>
                        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                          <tr>
                            <th scope="col" className="px-4 py-3 font-semibold">주문번호</th>
                            <th scope="col" className="px-4 py-3 font-semibold">상품</th>
                            <th scope="col" className="px-4 py-3 font-semibold">링크 토큰</th>
                            <th scope="col" className="px-4 py-3 font-semibold">매출 기준액</th>
                            <th scope="col" className="px-4 py-3 font-semibold">커미션</th>
                            <th scope="col" className="px-4 py-3 font-semibold">상태</th>
                            <th scope="col" className="px-4 py-3 text-right font-semibold">처리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {settlement.commissions.map((commission) => (
                            <CommissionDetailRow
                              key={commission.id}
                              commission={commission}
                              updating={updatingId !== null}
                              onUpdate={updateStatus}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommissionDetailRow({
  commission,
  updating,
  onUpdate
}: {
  commission: AdminCommissionDetail;
  updating: boolean;
  onUpdate: (
    commissionId: string,
    status: CommerceCommission["status"],
    requiresConfirmation?: boolean
  ) => void;
}) {
  const actions = getCommissionStatusActions({ currentStatus: commission.status }).filter(
    (action) => !action.disabledReason
  );

  return (
    <tr
      className="align-middle"
      data-testid={`commission-detail-${commission.id}`}
    >
      <td className="px-4 py-3 font-semibold">{commission.orderNumber}</td>
      <td className="max-w-[220px] truncate px-4 py-3 font-semibold">{commission.productName}</td>
      <td className="px-4 py-3 font-semibold">{commission.linkToken ?? "-"}</td>
      <td className="px-4 py-3 font-semibold">{formatUsd(commission.baseCents)}</td>
      <td className="px-4 py-3 font-semibold">{formatUsd(commission.amountCents)}</td>
      <td className="px-4 py-3">
        <CommissionStatusBadge status={commission.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {actions.length > 0 ? (
            actions.map((action) => (
              <Button
                key={action.status}
                type="button"
                size="sm"
                variant="outline"
                disabled={updating}
                onClick={() => onUpdate(commission.id, action.status, action.requiresConfirmation)}
              >
                {action.label}
              </Button>
            ))
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {getCommissionTerminalLabel(commission.status)}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function SettlementMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 lg:border-b-0">
      <span className="block text-xs font-semibold text-muted-foreground">{title}</span>
      <span className="mt-1 block text-lg font-bold">{value}</span>
    </div>
  );
}

function RowMetric({ title, value }: { title: string; value: string }) {
  return (
    <p className="min-w-0">
      <span className="block text-xs text-muted-foreground">{title}</span>
      <span className="block truncate font-semibold">{value}</span>
    </p>
  );
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

function AffiliateStatusBadge({ status }: { status: AdminCommissionSettlement["status"] }) {
  const className = {
    active: "bg-[#bbf7d0] text-black",
    paused: "bg-[#fff3a3] text-black",
    blocked: "bg-destructive text-destructive-foreground",
    unknown: "bg-muted text-muted-foreground"
  }[status];

  return <Badge className={className}>{getAffiliateStatusLabel(status)}</Badge>;
}

function summarizeSettlements(settlements: AdminCommissionSettlement[]) {
  return settlements.reduce(
    (summary, settlement) => ({
      totalCommissionCents: summary.totalCommissionCents + settlement.totalCommissionCents,
      unpaidCommissionCents: summary.unpaidCommissionCents + settlement.unpaidCommissionCents,
      paidCommissionCents: summary.paidCommissionCents + settlement.paidCommissionCents,
      cancelledCommissionCents: summary.cancelledCommissionCents + settlement.cancelledCommissionCents
    }),
    {
      totalCommissionCents: 0,
      unpaidCommissionCents: 0,
      paidCommissionCents: 0,
      cancelledCommissionCents: 0
    }
  );
}

function matchesSettlementQuery(settlement: AdminCommissionSettlement, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const searchable = [
    settlement.displayName,
    settlement.email,
    settlement.code,
    settlement.profileId,
    ...settlement.commissions.flatMap((commission) => [
      commission.orderNumber,
      commission.orderId,
      commission.productName,
      commission.linkToken
    ])
  ];

  return searchable.some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

function matchesSettlementStatus(
  settlement: AdminCommissionSettlement,
  statusFilter: StatusFilter
) {
  if (statusFilter === "all") {
    return true;
  }
  if (statusFilter === "unpaid") {
    return settlement.commissions.some((commission) => isUnpaidStatus(commission.status));
  }
  return settlement.commissions.some((commission) => commission.status === statusFilter);
}

function getUnpaidCommissions(settlement: AdminCommissionSettlement) {
  return settlement.commissions.filter((commission) => isUnpaidStatus(commission.status));
}

function getSettlementUpdateId(affiliateId: string) {
  return `settlement:${affiliateId}`;
}

function getSettlementPayConfirmMessage(
  settlement: AdminCommissionSettlement,
  unpaidCommissionCount: number
) {
  return `${settlement.displayName}의 미정산 커미션 ${unpaidCommissionCount}건(${formatUsd(
    settlement.unpaidCommissionCents
  )})을 모두 지급 완료 처리할까요? 실제 송금이 끝난 뒤에만 눌러주세요.`;
}

function getCommissionStatusActions({
  currentStatus
}: {
  currentStatus: CommerceCommission["status"];
}) {
  return (["paid", "cancelled"] as const).map((status) => ({
    status,
    label: getCommissionActionLabel(status),
    disabledReason:
      status === currentStatus
        ? "현재 상태입니다."
        : getCommissionStatusActionDisabledReason({
            currentStatus
          }) ?? undefined,
    requiresConfirmation: true
  }));
}

function getCommissionStatusActionDisabledReason({
  currentStatus
}: {
  currentStatus: CommerceCommission["status"];
}) {
  if (currentStatus === "paid") {
    return "지급 완료된 커미션은 상태를 변경할 수 없습니다.";
  }
  if (currentStatus === "cancelled") {
    return "제외된 커미션은 상태를 변경할 수 없습니다.";
  }
  if (isUnpaidStatus(currentStatus)) {
    return null;
  }
  return "미정산 커미션만 처리할 수 있습니다.";
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getStatusFilterLabel(status: StatusFilter) {
  const labels = {
    all: "전체",
    unpaid: "미정산",
    paid: "지급 완료",
    cancelled: "제외됨"
  };
  return labels[status];
}

function getAffiliateStatusLabel(status: AdminCommissionSettlement["status"]) {
  const labels = {
    active: "활성",
    paused: "일시 중지",
    blocked: "차단됨",
    unknown: "상태 없음"
  };
  return labels[status];
}

function getCommissionStatusLabel(status: CommerceCommission["status"]) {
  const labels = {
    pending: "미정산",
    approved: "미정산",
    paid: "지급 완료",
    cancelled: "제외됨"
  };

  return labels[status];
}

function getCommissionActionLabel(status: CommissionActionStatus) {
  const labels = {
    paid: "지급 완료",
    cancelled: "정산 제외"
  };
  return labels[status];
}

function getCommissionActionConfirmMessage(status: CommerceCommission["status"]) {
  if (status === "paid") {
    return "이 커미션을 지급 완료 처리할까요? 실제 지급한 뒤에만 눌러주세요.";
  }
  if (status === "cancelled") {
    return "이 커미션을 정산에서 제외할까요?";
  }
  return "커미션 상태를 변경할까요?";
}

function getCommissionTerminalLabel(status: CommerceCommission["status"]) {
  if (status === "paid") {
    return "처리 완료";
  }
  if (status === "cancelled") {
    return "제외 완료";
  }
  return "처리할 수 없음";
}

function isUnpaidStatus(status: CommerceCommission["status"]) {
  return status === "pending" || status === "approved";
}
