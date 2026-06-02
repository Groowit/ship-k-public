import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromoterPortalClient } from "./promoter-portal-client";
import type { PromoterDashboard } from "@/lib/commerce-store";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

describe("PromoterPortalClient", () => {
  beforeEach(() => {
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("keeps application setup concise and requires terms before applying", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PromoterPortalClient dashboard={{ ...dashboardFixture(), affiliate: null }} />);

    const submitButton = screen.getByRole("button", { name: "Start promoting" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submitButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/promoter/apply",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ termsAccepted: true })
      })
    );
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("shows an inline application error without refreshing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Application is unavailable" })
      })
    );
    render(<PromoterPortalClient dashboard={{ ...dashboardFixture(), affiliate: null }} />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Start promoting" }));

    expect(await screen.findByText("Application is unavailable")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("renders seller-readable summary metrics and product-link rows", () => {
    render(<PromoterPortalClient dashboard={dashboardFixture()} />);

    expect(screen.getByText("Creator Lee")).toBeInTheDocument();
    expect(screen.getByText("creator_code")).toBeInTheDocument();
    expect(screen.getAllByText("Clicks").length).toBeGreaterThan(0);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Unpaid commission")).toBeInTheDocument();
    expect(screen.getAllByText("$12.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /Product links/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: /Commissions/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByText("Showing 2 of 2 matching links")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("promoter-link-link_beta")).getByText("Beta Cream")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("promoter-link-link_alpha")).getByText("Alpha Cleanser")
    ).toBeInTheDocument();
  });

  it("searches product links and sorts them by seller intent", () => {
    render(<PromoterPortalClient dashboard={dashboardFixture()} />);

    fireEvent.change(screen.getByLabelText("Search product links"), {
      target: { value: "alpha" }
    });

    expect(screen.getByText("Showing 1 of 1 matching links")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("promoter-link-link_alpha")).getByText("Alpha Cleanser")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("promoter-link-link_beta")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search product links"), {
      target: { value: "" }
    });
    fireEvent.change(screen.getByLabelText("Sort product links"), {
      target: { value: "product" }
    });

    const rows = screen.getAllByTestId(/promoter-link-/);
    expect(within(rows[0]).getByText("Alpha Cleanser")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Beta Cream")).toBeInTheDocument();
  });

  it("keeps large product catalogs paged so commissions are not buried behind every link", () => {
    render(<PromoterPortalClient dashboard={dashboardWithLinkCount(10)} />);

    expect(screen.getByText("Showing 6 of 10 matching links")).toBeInTheDocument();
    expect(screen.getByTestId("promoter-link-link_1")).toBeInTheDocument();
    expect(screen.queryByTestId("promoter-link-link_10")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show more links" }));

    expect(screen.getByText("Showing 10 of 10 matching links")).toBeInTheDocument();
    expect(screen.getByTestId("promoter-link-link_10")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search product links"), {
      target: { value: "Product 10" }
    });

    expect(screen.getByText("Showing 1 of 1 matching links")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show more links" })).not.toBeInTheDocument();
  });

  it("copies the absolute product link and shows success feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });
    render(<PromoterPortalClient dashboard={dashboardFixture()} />);

    const row = screen.getByTestId("promoter-link-link_beta");
    fireEvent.click(within(row).getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(
        `${window.location.origin}/products/beta-cream?ref=creator_code&link=beta123`
      )
    );
    expect(within(row).getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("shows a copy failure state instead of crashing", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }
    });
    render(<PromoterPortalClient dashboard={dashboardFixture()} />);

    const row = screen.getByTestId("promoter-link-link_beta");
    fireEvent.click(within(row).getByRole("button", { name: "Copy link" }));

    expect(
      await within(row).findByText("Copy failed. Select the product link and copy it manually.")
    ).toBeInTheDocument();
  });

  it("translates commission statuses into payout language", () => {
    render(<PromoterPortalClient dashboard={dashboardFixture()} initialView="commissions" />);

    expect(screen.getByRole("tab", { name: /Product links/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByRole("tab", { name: /Commissions/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByTestId("promoter-link-link_beta")).not.toBeInTheDocument();

    const pending = screen.getByTestId("promoter-commission-commission_pending");
    const approved = screen.getByTestId("promoter-commission-commission_approved");
    const paid = screen.getByTestId("promoter-commission-commission_paid");
    const cancelled = screen.getByTestId("promoter-commission-commission_cancelled");

    expect(within(pending).getByText("Unpaid")).toBeInTheDocument();
    expect(within(approved).getByText("Unpaid")).toBeInTheDocument();
    expect(within(paid).getByText("Paid")).toBeInTheDocument();
    expect(within(cancelled).getByText("Excluded")).toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
  });

  it("filters commissions by payout status and order or product text", () => {
    render(<PromoterPortalClient dashboard={dashboardFixture()} initialView="commissions" />);

    fireEvent.change(screen.getByLabelText("Filter commissions by status"), {
      target: { value: "paid" }
    });

    expect(screen.getByText("Showing 1 of 4 commission rows")).toBeInTheDocument();
    expect(screen.getByTestId("promoter-commission-commission_paid")).toBeInTheDocument();
    expect(screen.queryByTestId("promoter-commission-commission_pending")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search commissions"), {
      target: { value: "SK1001" }
    });

    expect(screen.getByText("No matching commissions")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter commissions by status"), {
      target: { value: "all" }
    });

    expect(screen.getByTestId("promoter-commission-commission_pending")).toBeInTheDocument();
  });

  it("has clear empty and no-result states", () => {
    const { rerender } = render(
      <PromoterPortalClient dashboard={{ ...dashboardFixture(), links: [], commissions: [] }} />
    );

    expect(screen.getByText("No product links yet")).toBeInTheDocument();

    rerender(<PromoterPortalClient dashboard={dashboardFixture()} />);
    fireEvent.change(screen.getByLabelText("Search product links"), {
      target: { value: "missing serum" }
    });

    expect(screen.getByText("No matching links")).toBeInTheDocument();

    rerender(
      <PromoterPortalClient
        dashboard={{ ...dashboardFixture(), links: [], commissions: [] }}
        initialView="commissions"
      />
    );

    expect(screen.getByText("No commissions in this period")).toBeInTheDocument();
  });
});

function dashboardWithLinkCount(count: number): PromoterDashboard {
  return {
    ...dashboardFixture(),
    links: Array.from({ length: count }, (_, index) => {
      const number = index + 1;
      return {
        id: `link_${number}`,
        productId: `product_${number}`,
        productName: `Product ${number}`,
        productSlug: `product-${number}`,
        status: "active",
        linkToken: `token${number}`,
        referralPath: `/products/product-${number}?ref=creator_code&link=token${number}`,
        totalClicks: count - index,
        uniqueClicks: count - index,
        orders: 0,
        salesCents: 0,
        commissionCents: 0
      };
    })
  };
}

function dashboardFixture(): PromoterDashboard {
  return {
    affiliate: {
      id: "affiliate_1",
      profileId: "profile_1",
      code: "creator_code",
      displayName: "Creator Lee",
      status: "active",
      termsAcceptedAt: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z"
    },
    range: "30d",
    schemaReady: true,
    summary: {
      totalClicks: 42,
      uniqueClicks: 30,
      orders: 3,
      salesCents: 12_000,
      pendingCommissionCents: 900,
      approvedCommissionCents: 300,
      paidCommissionCents: 450
    },
    links: [
      {
        id: "link_beta",
        productId: "product_beta",
        productName: "Beta Cream",
        productSlug: "beta-cream",
        status: "active",
        linkToken: "beta123",
        referralPath: "/products/beta-cream?ref=creator_code&link=beta123",
        totalClicks: 40,
        uniqueClicks: 28,
        orders: 3,
        salesCents: 12_000,
        commissionCents: 1_200
      },
      {
        id: "link_alpha",
        productId: "product_alpha",
        productName: "Alpha Cleanser",
        productSlug: "alpha-cleanser",
        status: "active",
        linkToken: "alpha123",
        referralPath: "/products/alpha-cleanser?ref=creator_code&link=alpha123",
        totalClicks: 2,
        uniqueClicks: 2,
        orders: 0,
        salesCents: 0,
        commissionCents: 0
      }
    ],
    commissions: [
      {
        id: "commission_pending",
        orderNumber: "SK1001",
        productName: "Beta Cream",
        linkToken: "beta123",
        baseCents: 9_000,
        amountCents: 900,
        status: "pending",
        holdUntil: "2026-06-30"
      },
      {
        id: "commission_approved",
        orderNumber: "SK1002",
        productName: "Beta Cream",
        linkToken: "beta123",
        baseCents: 3_000,
        amountCents: 300,
        status: "approved",
        holdUntil: "2026-06-30"
      },
      {
        id: "commission_paid",
        orderNumber: "SK1003",
        productName: "Alpha Cleanser",
        linkToken: "alpha123",
        baseCents: 4_500,
        amountCents: 450,
        status: "paid",
        holdUntil: "2026-06-30"
      },
      {
        id: "commission_cancelled",
        orderNumber: "SK1004",
        productName: "Alpha Cleanser",
        linkToken: "alpha123",
        baseCents: 1_500,
        amountCents: 150,
        status: "cancelled",
        holdUntil: "2026-06-30"
      }
    ]
  };
}
