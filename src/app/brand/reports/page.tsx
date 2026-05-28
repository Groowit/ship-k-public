import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { getCurrentAuthState } from "@/lib/auth";
import {
  BrandReportRange,
  getBrandReportForUser,
  listBrandMembershipsForUser
} from "@/lib/brand-store";
import { formatUsd } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BrandReportsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user } = await getCurrentAuthState();

  if (!user) {
    return null;
  }

  const memberships = await listBrandMembershipsForUser(user.id);
  if (memberships.length === 0) {
    return (
      <section className="rounded-md border bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">403</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal">브랜드 멤버 권한이 필요합니다</h2>
        <p className="mt-3 text-muted-foreground">매출/정산 요약은 브랜드 멤버에게만 제공됩니다.</p>
      </section>
    );
  }

  const range = getRange(params.range);
  const report = await getBrandReportForUser({ userId: user.id, range });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">매출/정산 요약</h2>
          <p className="text-sm text-muted-foreground">
            브랜드 배정 상품 기준의 읽기 전용 집계입니다. 정산 처리나 지급 요청은 이 화면에서 제공하지 않습니다.
          </p>
        </div>
        <div className="flex gap-2">
          {(["30d", "90d", "all"] as const).map((option) => (
            <Link
              key={option}
              href={`/brand/reports?range=${option}`}
              className={cn(buttonVariants({ variant: option === range ? "default" : "outline", size: "sm" }))}
            >
              {getRangeLabel(option)}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryBox label="주문 수" value={`${report.totalOrders.toLocaleString("ko-KR")}건`} />
        <SummaryBox label="판매 수량" value={`${report.unitsSold.toLocaleString("ko-KR")}개`} />
        <SummaryBox label="총 상품 매출" value={formatUsd(report.grossSalesCents)} />
        <SummaryBox label="예상 정산 기준액" value={formatUsd(report.estimatedSettlementCents)} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryBox label="진행 중 매출" value={formatUsd(report.pendingSettlementCents)} tone="muted" />
        <SummaryBox label="배송완료 매출" value={formatUsd(report.deliveredSalesCents)} tone="muted" />
        <SummaryBox label="취소/환불 제외액" value={formatUsd(report.excludedSalesCents)} tone="muted" />
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">상품</th>
              <th className="px-4 py-3">판매 수량</th>
              <th className="px-4 py-3">상품 매출</th>
              <th className="px-4 py-3">정산 기준</th>
            </tr>
          </thead>
          <tbody>
            {report.products.length ? (
              report.products.map((product) => (
                <tr key={product.productId} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{product.productName}</td>
                  <td className="px-4 py-3">{product.unitsSold.toLocaleString("ko-KR")}개</td>
                  <td className="px-4 py-3">{formatUsd(product.grossSalesCents)}</td>
                  <td className="px-4 py-3">
                    <Badge>{formatUsd(product.estimatedSettlementCents)}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  선택한 기간에 집계할 매출이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className={cn("rounded-md border bg-white p-4", tone === "muted" && "bg-muted/30")}>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal">{value}</p>
    </div>
  );
}

function getRange(raw: string | string[] | undefined): BrandReportRange {
  if (raw === "90d" || raw === "all") {
    return raw;
  }

  return "30d";
}

function getRangeLabel(range: BrandReportRange) {
  if (range === "90d") {
    return "90일";
  }

  if (range === "all") {
    return "전체";
  }

  return "30일";
}
