import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminProductEditor } from "./admin-product-form";
import { productDisclosureSections } from "@/lib/product-disclosure-notes";
import type { Product } from "@/lib/products";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh
  })
}));

describe("AdminProductEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    push.mockClear();
    refresh.mockClear();
  });

  it("adds product data and opens a separate customer preview", () => {
    render(<AdminProductEditor mode="create" />);

    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Rice Calm Cream" }
    });
    fireEvent.change(screen.getByLabelText("상품 태그"), {
      target: { value: "rice, comfort" }
    });
    fireEvent.change(screen.getByLabelText("대표 이미지"), {
      target: { value: "/catalog-assets/admin-product-placeholder.svg" }
    });
    fireEvent.click(screen.getByTestId("add-gallery-images"));
    fireEvent.change(screen.getByLabelText("갤러리 이미지 1"), {
      target: { value: "/catalog-assets/admin-product-placeholder.svg" }
    });
    fireEvent.change(screen.getByLabelText("갤러리 이미지 1 대체 텍스트"), {
      target: { value: "Cream texture" }
    });

    fireEvent.click(screen.getByTestId("add-included-items"));
    expect(screen.getByText("구성품 1")).toBeVisible();

    fireEvent.change(screen.getByLabelText("구성품명"), {
      target: { value: "Rice Calm Cream" }
    });
    fireEvent.change(screen.getByLabelText("구성품 유형"), {
      target: { value: "Skincare" }
    });
    fireEvent.change(screen.getByLabelText("사용 메모"), {
      target: { value: "A calm moisturizing step." }
    });

    fireEvent.click(screen.getByTestId("add-routine-steps"));
    expect(screen.getByText("사용 단계 1")).toBeVisible();

    fireEvent.change(screen.getByLabelText("단계명"), {
      target: { value: "Apply cream" }
    });
    fireEvent.change(screen.getByLabelText("수행 방법"), {
      target: { value: "Apply after serum." }
    });

    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "Rice Calm Story" }
    });
    fireEvent.change(screen.getByLabelText("본문"), {
      target: { value: "A soft gel cream texture with a dewy finish." }
    });

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    expect(screen.getByRole("heading", { name: "Rice Calm Cream", level: 1 })).toBeVisible();
    expect(screen.getByText("RICE")).toBeVisible();
    expect(screen.getByAltText("Rice Calm Cream intro image")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View media: Cream texture" }));
    expect(screen.getByAltText("Cream texture")).toBeVisible();
    const storyHeading = screen.getByRole("heading", { name: "Rice Calm Story" });
    expect(storyHeading).toBeVisible();
    expect(screen.getAllByText("A soft gel cream texture with a dewy finish.").length).toBeGreaterThanOrEqual(1);
  });

  it("uses the brand detail editor structure for both admin creation and editing", () => {
    const { rerender } = render(<AdminProductEditor mode="create" />);

    expect(screen.getByText("운영 상품 설정")).toBeVisible();
    expect(screen.getByLabelText("상품 표시 브랜드명")).toBeVisible();
    expect(screen.getByText("브랜드 포털 연결")).toBeVisible();
    expect(screen.getByText("상세 스토리 에디터")).toBeVisible();
    expect(screen.getByRole("link", { name: "운영 설정" })).toHaveAttribute(
      "href",
      "#admin-product-operations"
    );
    expect(screen.getByRole("link", { name: "상세 스토리" })).toHaveAttribute(
      "href",
      "#admin-product-story"
    );
    expect(screen.getAllByText("새 내용 추가").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "긴 상세 이미지 추가" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "단계 추가" }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("텍스트 글자 크기")).toBeVisible();
    expect(screen.getByRole("button", { name: "텍스트 글자색 핑크" })).toBeVisible();
    expect(screen.getByLabelText("제목")).toBeVisible();
    expect(screen.getByLabelText("본문")).toBeVisible();
    expect(screen.getByLabelText("가격 USD")).toBeVisible();
    expect(screen.getByRole("button", { name: "판매중으로 발행" })).toBeVisible();

    rerender(<AdminProductEditor mode="edit" product={productFixture()} />);

    expect(screen.getByText("운영 상품 설정")).toBeVisible();
    expect(screen.getByText("상세 스토리 에디터")).toBeVisible();
    expect(screen.getByText("Glow Set · 공개 접근 가능")).toBeVisible();
    expect(screen.getByLabelText("가격 USD")).toBeVisible();
    expect(screen.getByRole("button", { name: "변경사항 발행" })).toBeVisible();
    expect(screen.getByRole("button", { name: "숨기기" })).toBeVisible();
  });

  it("sends explicit brand partner assignment fields from the product editor", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "draft-1", name: "Draft Product" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="create" brandOptions={brandOptionsFixture()} />);

    fireEvent.change(screen.getByLabelText("상품 표시 브랜드명"), {
      target: { value: "Catalog Label" }
    });
    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Draft Product" }
    });
    fireEvent.change(screen.getByLabelText("브랜드 파트너"), {
      target: { value: "brand_1" }
    });
    fireEvent.click(screen.getByLabelText("상세 편집 허용"));
    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.brandName).toBe("Catalog Label");
    expect(body.brandPartnerId).toBe("brand_1");
    expect(body.canEditDetails).toBe(false);
  });

  it("edits fixed admin disclosure notes and sends them in draft payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "draft-1", name: "Draft Product" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="create" />);

    expect(screen.getAllByText("구매 전 공개 정보").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Curator's Note/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Formula Breakdown/ })).toHaveAttribute("aria-expanded", "false");

    productDisclosureSections.forEach((section) => {
      const button = screen.getByRole("button", { name: new RegExp(section.label) });
      if (button.getAttribute("aria-expanded") === "false") {
        fireEvent.click(button);
      }

      section.fields.forEach((field) => {
        fireEvent.change(screen.getByLabelText(`${section.label} ${field.label}`), {
          target: { value: `${section.label} / ${field.label} copy` }
        });
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.disclosureNotes.curatorsNote.selectionReason).toBe(
      "Curator's Note / Selection reason copy"
    );
    expect(body.disclosureNotes.beforeYouBuy.returnsNote).toBe(
      "Before You Buy / Returns note copy"
    );
  });

  it("selects and reorders detail sections from blocks beyond the first one", () => {
    render(<AdminProductEditor mode="create" />);

    expect(screen.getByLabelText("제목 단계")).toBeVisible();

    fireEvent.focusIn(screen.getByLabelText("본문"));

    expect(screen.getByLabelText("본문 굵기")).toBeVisible();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole("button", { name: "섹션 2 문단 선택 및 드래그" }), {
      dataTransfer
    });
    fireEvent.dragOver(screen.getByRole("listitem", { name: "상세 섹션 1: 제목" }), { dataTransfer });
    fireEvent.drop(screen.getByRole("listitem", { name: "상세 섹션 1: 제목" }), { dataTransfer });

    const sectionItems = screen.getAllByRole("listitem", { name: /상세 섹션/ });
    expect(sectionItems[0]).toHaveAccessibleName("상세 섹션 1: 문단");
    expect(screen.getByLabelText("본문 굵기")).toBeVisible();
  });

  it("does not send untouched blank structured rows in the draft payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "draft-1", name: "Draft Product" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="create" />);

    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Draft Product" }
    });
    fireEvent.click(screen.getByTestId("add-included-items"));
    fireEvent.click(screen.getByTestId("add-routine-steps"));

    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.includedItems).toEqual([]);
    expect(body.routineSteps).toEqual([]);
    expect(body.contentBlocks).toEqual([]);
    expect(body.detailSections.length).toBeGreaterThan(0);
    expect(push).toHaveBeenCalledWith("/admin/products/draft-1");
  });

  it("saves loaded edit products with PATCH and refreshes the current editor", async () => {
    const savedProduct = { ...productFixture(), name: "Glow Set Updated" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: savedProduct })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="edit" product={productFixture()} />);

    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Glow Set Updated" }
    });
    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [endpoint, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(endpoint).toBe("/api/admin/products/product_1");
    expect(request.method).toBe("PATCH");
	    expect(body.name).toBe("Glow Set Updated");
	    expect(body.tags).toEqual(["SKINCARE", "SET"]);
	    expect(body.detailSections.length).toBeGreaterThan(0);
    expect(push).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("admin-product-message")).toHaveTextContent(
      "Glow Set Updated 상품을 임시저장했습니다."
    );
  });

  it("does not resave legacy content blocks when canonical detail sections already exist", async () => {
    const product = {
      ...productWithLongDetailSections(),
      contentBlocks: [
        {
          id: "legacy-image",
          type: "image",
          imagePath: "/old-detail-image.png",
          alt: "Old detail image"
        },
        {
          id: "legacy-story",
          type: "text",
          eyebrow: "Product story",
          title: "Old story",
          body: "Old story copy"
        }
      ]
    } satisfies Product;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="edit" product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.contentBlocks).toEqual([]);
    expect(body.detailSections.length).toBeGreaterThan(0);
  });

  it("hides loaded edit products without hard deleting them", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<AdminProductEditor mode="edit" product={productFixture()} />);

    fireEvent.click(screen.getByRole("button", { name: "숨기기" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/products/product_1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" })
      })
    );
    expect(push).toHaveBeenCalledWith("/admin/products");
  });

  it("keeps long loaded edit detail headings editable without stretching the editor", async () => {
    const product = productWithLongDetailSections();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { ...product, detailSections: product.detailSections } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="edit" product={product} />);

    const headingField = screen.getByDisplayValue(
      "Ocean-light hydration that feels memorable and wraps safely inside the editor"
    );
    expect(headingField.tagName).toBe("TEXTAREA");
    expect(headingField.className).toContain("[overflow-wrap:anywhere]");

    fireEvent.change(headingField, {
      target: { value: "Compact edit heading" }
    });
    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.detailSections[0]).toMatchObject({
      sectionType: "heading",
      text: "Compact edit heading"
    });
  });

  it("does not call an undefined edit endpoint when edit product data is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="edit" />);

    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-product-message")).toHaveTextContent(
        "수정할 상품을 찾지 못했습니다. 상품 목록에서 다시 진입해주세요."
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes intro video links in the customer preview", () => {
    render(<AdminProductEditor mode="create" />);

    fireEvent.change(screen.getByLabelText("상품명"), {
      target: { value: "Video Serum" }
    });
    fireEvent.change(screen.getByLabelText("인트로 영상 URL"), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
    });

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    expect(screen.getByTitle("Video Serum intro video")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });

  it("does not inject a sample video URL when adding a blank detail video section", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "draft-1", name: "Draft Product" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminProductEditor mode="create" />);

    fireEvent.click(screen.getAllByRole("button", { name: "영상 추가" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(JSON.stringify(body.detailSections)).not.toContain("dQw4w9WgXcQ");
    expect(body.detailSections.some((section: { sectionType: string }) => section.sectionType === "video")).toBe(
      false
    );
  });
});

function createDataTransfer() {
  const values = new Map<string, string>();

  return {
    effectAllowed: "",
    dropEffect: "",
    setData: vi.fn((type: string, value: string) => values.set(type, value)),
    getData: vi.fn((type: string) => values.get(type) ?? "")
  };
}

function productFixture() {
  return {
    id: "product_1",
    slug: "glow-set",
    productType: "set",
    brandName: "Glow Brand",
    name: "Glow Set",
    category: "Skincare",
    difficulty: "Beginner",
    itemCount: 1,
    shortDescription: "기존 요약",
    description: "기존 상세 본문",
    bestFor: "아침 루틴",
    result: "촉촉한 마무리",
	    heroImagePath: "/hero.png",
	    badges: [],
	    tags: ["SKINCARE", "SET"],
	    status: "active",
    updatedAt: "2026-05-28T00:00:00.000Z",
    option: {
      id: "option_1",
      name: "Default option",
      sku: "GLOW-SET",
      priceCents: 4900,
      stockQuantity: 10
    },
    galleryImages: [],
    includedItems: [],
    routineSteps: [],
    contentBlocks: [],
    detailSections: []
  } satisfies Product;
}

function brandOptionsFixture() {
  return [
    {
      id: "brand_1",
      name: "Bubble Tide",
      slug: "bubble-tide",
      status: "active" as const,
      contactEmail: "owner@bubble.test"
    }
  ];
}

function productWithLongDetailSections() {
  return {
    ...productFixture(),
    detailSections: [
      {
        id: "detail-heading-1",
        schemaVersion: 1,
        sortOrder: 1,
        sectionType: "heading",
        text: "Ocean-light hydration that feels memorable and wraps safely inside the editor",
        level: "h2",
        align: "left",
        fontSize: "hero",
        textColor: "default"
      },
      {
        id: "detail-text-1",
        schemaVersion: 1,
        sortOrder: 2,
        sectionType: "text",
        body: "Seafoam Splash Hydration Set turns a simple three-step skincare routine into a product page with personality.",
        align: "left",
        fontSize: "large",
        textColor: "muted",
        fontWeight: "regular"
      }
    ]
  } satisfies Product;
}
