import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminBrandManagementClient } from "./admin-brand-management-client";
import type { AdminBrandSummary } from "@/lib/brand-store";
import type { Product } from "@/lib/products";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

describe("AdminBrandManagementClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("renders brand operations as a selected management workspace", () => {
    render(<AdminBrandManagementClient brands={brandFixtures()} products={productFixtures()} />);

    expect(screen.getByLabelText("브랜드 검색")).toBeInTheDocument();
    expect(screen.getByTestId("brand-row-brand_1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("brand-row-brand_2")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("separator", { name: "브랜드 목록과 상세 구분선" })).toBeInTheDocument();
    expect(screen.getByText("운영 정보 저장")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "멤버 연결" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이관/연결" })).toBeInTheDocument();
    expect(screen.getByText("표시 브랜드명 일치")).toBeInTheDocument();
    expect(screen.getByText("1개 확인")).toBeInTheDocument();
  });

  it("filters brand rows from the search field", () => {
    render(<AdminBrandManagementClient brands={brandFixtures()} products={productFixtures()} />);

    fireEvent.change(screen.getByLabelText("브랜드 검색"), { target: { value: "testbrand" } });

    expect(screen.queryByTestId("brand-row-brand_1")).not.toBeInTheDocument();
    expect(screen.getByTestId("brand-row-brand_2")).toBeInTheDocument();
    expect(screen.getByLabelText("선택한 브랜드 상세")).toHaveTextContent("검색 결과에서 관리할 브랜드를 선택해주세요.");
  });

  it("opens the clicked brand detail below the row list", () => {
    render(<AdminBrandManagementClient brands={brandFixtures()} products={productFixtures()} />);

    fireEvent.click(screen.getByTestId("brand-row-brand_2"));

    const detail = screen.getByLabelText("선택한 브랜드 상세");
    expect(screen.getByTestId("brand-row-brand_2")).toHaveAttribute("aria-pressed", "true");
    expect(within(detail).getByRole("heading", { name: "TestBrand" })).toBeInTheDocument();
    expect(within(detail).getByText("jaeheon010826@gmail.com")).toBeInTheDocument();
  });

  it("resets the create form after an async brand create request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        brand: {
          id: "brand_3",
          name: "New Brand"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminBrandManagementClient brands={brandFixtures()} products={productFixtures()} />);
    const createForm = screen.getByRole("button", { name: "브랜드 파트너 생성" }).closest("form") as HTMLFormElement;
    const nameInput = within(createForm).getByPlaceholderText("예: Glow Brand");
    const emailInput = within(createForm).getByPlaceholderText("owner@example.com");
    fireEvent.change(nameInput, { target: { value: "New Brand" } });
    fireEvent.change(emailInput, { target: { value: "owner@new.test" } });

    fireEvent.submit(createForm);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/brands",
      expect.objectContaining({ method: "POST" })
    ));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("New Brand 브랜드를 생성했습니다."));
    expect(nameInput).toHaveValue("");
    expect(emailInput).toHaveValue("");
  });

  it("sends member role and status changes through the selected brand endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ membership: { id: "membership_1" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminBrandManagementClient brands={brandFixtures()} products={productFixtures()} />);
    const memberForm = screen.getByText("jaeheon0826@gmail.com").closest("form") as HTMLFormElement;
    fireEvent.change(within(memberForm).getByLabelText("역할"), { target: { value: "viewer" } });
    fireEvent.change(within(memberForm).getByLabelText("상태"), { target: { value: "paused" } });

    fireEvent.submit(memberForm);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/brands/brand_1/members");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      membershipId: "membership_1",
      memberRole: "viewer",
      status: "paused"
    });
  });

  it("shows assigned products separately from transferable products", () => {
    render(<AdminBrandManagementClient brands={brandFixtures()} products={productFixtures()} />);

    expect(screen.getByRole("option", { name: "Seafoam Splash Hydration Set / 이미 배정됨" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Rice Cloud Cream / 현재 TestBrand" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Fresh Start Toner / Fresh Lab" })).toBeEnabled();
  });
});

function brandFixtures(): AdminBrandSummary[] {
  const [seafoam, riceCloud] = productFixtures();

  return [
    {
      id: "brand_1",
      name: "Bubble Tide",
      slug: "bubble-tide",
      status: "active",
      contactEmail: "owner@bubble.test",
      memberships: [
        {
          id: "membership_1",
          brandId: "brand_1",
          profileId: "profile_1",
          email: "jaeheon0826@gmail.com",
          memberRole: "owner",
          status: "active"
        }
      ],
      assignments: [
        {
          id: "assignment_1",
          brandId: "brand_1",
          productId: "product_1",
          status: "active",
          canEditDetails: true,
          product: seafoam
        }
      ]
    },
    {
      id: "brand_2",
      name: "TestBrand",
      slug: "testbrand",
      status: "active",
      memberships: [
        {
          id: "membership_2",
          brandId: "brand_2",
          profileId: "profile_2",
          email: "jaeheon010826@gmail.com",
          memberRole: "editor",
          status: "active"
        }
      ],
      assignments: [
        {
          id: "assignment_2",
          brandId: "brand_2",
          productId: "product_2",
          status: "active",
          canEditDetails: true,
          product: riceCloud
        }
      ]
    }
  ];
}

function productFixtures(): Product[] {
  return [
    productFixture({
      id: "product_1",
      name: "Seafoam Splash Hydration Set",
      slug: "seafoam-splash",
      brandName: "Seafoam Studio"
    }),
    productFixture({
      id: "product_2",
      name: "Rice Cloud Cream",
      slug: "rice-cloud",
      brandName: "Rice Cloud"
    }),
    productFixture({
      id: "product_3",
      name: "Fresh Start Toner",
      slug: "fresh-start-toner",
      brandName: "Fresh Lab"
    })
  ];
}

function productFixture({
  id,
  name,
  slug,
  brandName
}: {
  id: string;
  name: string;
  slug: string;
  brandName: string;
}): Product {
  return {
    id,
    slug,
    productType: "single",
    brandName,
    name,
    category: "Skincare",
    difficulty: "Beginner",
    itemCount: 1,
    shortDescription: "",
    description: "",
    bestFor: "",
    result: "",
    heroImagePath: "/hero.png",
    badges: [],
    tags: ["SKINCARE", "SINGLE"],
    status: "active",
    option: {
      id: `${id}_option`,
      name: "Default option",
      sku: id,
      priceCents: 4900,
      stockQuantity: 10
    },
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: [],
    detailSections: []
  };
}
