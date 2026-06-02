import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCommissionsClient } from "./admin-commissions-client";
import type { AdminCommissionSettlement } from "@/lib/commerce-store";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

describe("AdminCommissionsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders promoter settlement summaries without exposing raw commission details first", () => {
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    expect(screen.getByText("총 정산액")).toBeInTheDocument();
    expect(screen.getByTestId("settlement-row-affiliate_1")).toBeInTheDocument();
    expect(screen.getByText("Creator Kim")).toBeInTheDocument();
    expect(screen.getByText("creator@example.com")).toBeInTheDocument();
    expect(screen.queryByText("creator_code")).not.toBeInTheDocument();
    const firstRow = screen.getByTestId("settlement-row-affiliate_1");
    expect(within(firstRow).getAllByText("미정산")).toHaveLength(1);
    expect(within(firstRow).getByText("$9.20")).toBeInTheDocument();
    expect(within(firstRow).getByText("미정산 2건 지급 완료")).toBeInTheDocument();
    expect(within(firstRow).getByText("제외됨")).toBeInTheDocument();
    expect(screen.queryByText("지급 가능")).not.toBeInTheDocument();
    expect(screen.queryByText("승인됨")).not.toBeInTheDocument();
    expect(screen.queryByText("보류 해제일")).not.toBeInTheDocument();
    expect(screen.queryByTestId("commission-detail-commission_1")).not.toBeInTheDocument();
  });

  it("expands one promoter to show its underlying commission ledger rows", () => {
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    const firstRow = screen.getByTestId("settlement-row-affiliate_1");
    fireEvent.click(within(firstRow).getByRole("button", { name: "상세 보기" }));

    expect(within(firstRow).getByTestId("commission-detail-commission_1")).toBeInTheDocument();
    expect(within(firstRow).getByText("SK1001")).toBeInTheDocument();
    expect(within(firstRow).getByText("Glow Set")).toBeInTheDocument();
    expect(within(firstRow).getByText("link_1")).toBeInTheDocument();
    expect(within(firstRow).getByRole("button", { name: "접기" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.queryByTestId("commission-detail-commission_3")).not.toBeInTheDocument();
  });

  it("filters settlements by promoter and detail text", () => {
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    fireEvent.change(screen.getByLabelText("정산 검색"), { target: { value: "SK1003" } });

    expect(screen.queryByTestId("settlement-row-affiliate_1")).not.toBeInTheDocument();
    expect(screen.getByTestId("settlement-row-affiliate_2")).toBeInTheDocument();
  });

  it("filters to promoters with unpaid commissions", () => {
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    fireEvent.change(screen.getByLabelText("상태 필터"), { target: { value: "unpaid" } });

    expect(screen.getByTestId("settlement-row-affiliate_1")).toBeInTheDocument();
    expect(screen.queryByTestId("settlement-row-affiliate_2")).not.toBeInTheDocument();
  });

  it("updates an individual commission through the existing status endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    const firstRow = screen.getByTestId("settlement-row-affiliate_1");
    fireEvent.click(within(firstRow).getByRole("button", { name: "상세 보기" }));
    const detail = within(firstRow).getByTestId("commission-detail-commission_1");
    fireEvent.click(within(detail).getByRole("button", { name: "지급 완료" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/commissions/commission_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paid" })
      })
    );
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("settles every unpaid commission for one promoter with a single action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirmMock);
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    const firstRow = screen.getByTestId("settlement-row-affiliate_1");
    fireEvent.click(within(firstRow).getByRole("button", { name: "미정산 2건 지급 완료" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(confirmMock).toHaveBeenCalledWith(
      "Creator Kim의 미정산 커미션 2건($9.20)을 모두 지급 완료 처리할까요? 실제 송금이 끝난 뒤에만 눌러주세요."
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/commissions/settlements/affiliate_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paid" })
      })
    );
    expect(refreshMock).toHaveBeenCalledOnce();
    expect(
      within(screen.getByTestId("settlement-row-affiliate_2")).queryByRole("button", {
        name: /미정산/
      })
    ).not.toBeInTheDocument();
  });

  it("confirms manual settlement actions and locks terminal rows", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", confirmMock);
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    const firstRow = screen.getByTestId("settlement-row-affiliate_1");
    fireEvent.click(within(firstRow).getByRole("button", { name: "상세 보기" }));

    const legacyApprovedDetail = within(firstRow).getByTestId("commission-detail-commission_2");
    expect(within(legacyApprovedDetail).getByText("미정산")).toBeInTheDocument();
    expect(within(legacyApprovedDetail).getByRole("button", { name: "지급 완료" })).toBeEnabled();
    expect(within(legacyApprovedDetail).getByRole("button", { name: "정산 제외" })).toBeEnabled();
    expect(within(legacyApprovedDetail).queryByText("승인됨")).not.toBeInTheDocument();

    const unpaidDetail = within(firstRow).getByTestId("commission-detail-commission_1");
    fireEvent.click(within(unpaidDetail).getByRole("button", { name: "정산 제외" }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/commissions/commission_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" })
      })
    );

    const secondRow = screen.getByTestId("settlement-row-affiliate_2");
    fireEvent.click(within(secondRow).getByRole("button", { name: "상세 보기" }));
    const paidDetail = within(secondRow).getByTestId("commission-detail-commission_3");
    expect(within(paidDetail).getByText("처리 완료")).toBeInTheDocument();
    expect(within(paidDetail).queryByRole("button", { name: "정산 제외" })).not.toBeInTheDocument();
  });

  it("shows an inline error when a status update fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "정산 상태 변경 실패" })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    render(<AdminCommissionsClient settlements={settlementFixtures()} />);

    const firstRow = screen.getByTestId("settlement-row-affiliate_1");
    fireEvent.click(within(firstRow).getByRole("button", { name: "상세 보기" }));
    fireEvent.click(
      within(within(firstRow).getByTestId("commission-detail-commission_1")).getByRole("button", {
        name: "정산 제외"
      })
    );

    expect(await screen.findByText("정산 상태 변경 실패")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("renders empty and search-empty states", () => {
    const { rerender } = render(<AdminCommissionsClient settlements={[]} />);

    expect(screen.getByText("정산할 홍보자 커미션이 없습니다.")).toBeInTheDocument();

    rerender(<AdminCommissionsClient settlements={settlementFixtures()} />);
    fireEvent.change(screen.getByLabelText("정산 검색"), { target: { value: "nothing" } });

    expect(screen.getByText("조건에 맞는 홍보자 정산 내역이 없습니다.")).toBeInTheDocument();
  });
});

function settlementFixtures(): AdminCommissionSettlement[] {
  return [
    {
      affiliateId: "affiliate_1",
      profileId: "profile_1",
      code: "creator_code",
      displayName: "Creator Kim",
      email: "creator@example.com",
      status: "active",
      createdAt: "2026-05-01T00:00:00.000Z",
      termsAcceptedAt: "2026-05-01T00:00:00.000Z",
      commissionCount: 2,
      orders: 2,
      salesBaseCents: 9_200,
      totalCommissionCents: 920,
      unpaidCommissionCents: 920,
      paidCommissionCents: 0,
      cancelledCommissionCents: 0,
      commissions: [
        {
          id: "commission_1",
          orderId: "order_1",
          orderNumber: "SK1001",
          referralCode: "creator_code",
          linkToken: "link_1",
          productName: "Glow Set",
          baseCents: 4_200,
          rateBps: 1_000,
          amountCents: 420,
          status: "pending",
          holdUntil: "2026-05-20T00:00:00.000Z",
          createdAt: "2026-05-20T00:00:00.000Z"
        },
        {
          id: "commission_2",
          orderId: "order_2",
          orderNumber: "SK1002",
          referralCode: "creator_code",
          linkToken: "link_2",
          productName: "Hydration Kit",
          baseCents: 5_000,
          rateBps: 1_000,
          amountCents: 500,
          status: "approved",
          holdUntil: "2026-12-30T00:00:00.000Z",
          createdAt: "2026-05-21T00:00:00.000Z"
        }
      ]
    },
    {
      affiliateId: "affiliate_2",
      profileId: "profile_2",
      code: "sunny_code",
      displayName: "Sunny Beauty",
      email: "sunny@example.com",
      status: "paused",
      createdAt: "2026-05-02T00:00:00.000Z",
      termsAcceptedAt: "2026-05-02T00:00:00.000Z",
      commissionCount: 1,
      orders: 1,
      salesBaseCents: 8_000,
      totalCommissionCents: 800,
      unpaidCommissionCents: 0,
      paidCommissionCents: 800,
      cancelledCommissionCents: 0,
      commissions: [
        {
          id: "commission_3",
          orderId: "order_3",
          orderNumber: "SK1003",
          referralCode: "sunny_code",
          linkToken: "link_3",
          productName: "Lip Tint Trio",
          baseCents: 8_000,
          rateBps: 1_000,
          amountCents: 800,
          status: "paid",
          holdUntil: "2026-05-20T00:00:00.000Z",
          createdAt: "2026-05-22T00:00:00.000Z"
        }
      ]
    }
  ];
}
