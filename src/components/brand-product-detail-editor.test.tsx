import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProductDetailEditor } from "./brand-product-detail-editor";
import type { Product } from "@/lib/products";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

vi.mock("@/components/product-detail-view", () => ({
  ProductDetailView: () => <div data-testid="product-preview" />
}));

describe("BrandProductDetailEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Korean content-only editor without commerce controls", () => {
    render(<BrandProductDetailEditor product={productFixture()} />);

    expect(screen.getByText("상세 스토리 에디터")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "긴 상세 이미지 추가" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "일반 단계 추가" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("더보기")).not.toBeInTheDocument();
    expect(screen.queryByText("빠른 시작")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
    expect(screen.getByLabelText("텍스트 글자 크기")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "텍스트 글자색 핑크" })).toBeInTheDocument();
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("본문")).toBeInTheDocument();
    expect(screen.queryByLabelText("짧은 설명")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("가격 USD")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
    expect(screen.queryByText("판매중으로 발행")).not.toBeInTheDocument();
  });

  it("opens the public preview only after the preview button is clicked", () => {
    render(<BrandProductDetailEditor product={productFixture()} />);

    expect(screen.queryByTestId("product-preview")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    expect(screen.getByText("공개 상세 화면 미리보기")).toBeInTheDocument();
    expect(screen.getByTestId("product-preview")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "편집으로 돌아가기" }));

    expect(screen.getByText("상세 스토리 에디터")).toBeInTheDocument();
    expect(screen.queryByTestId("product-preview")).not.toBeInTheDocument();
  });

  it("saves only allowed detail content fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "product_1", name: "Glow Set" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BrandProductDetailEditor product={productFixture()} />);
    fireEvent.change(screen.getByLabelText("본문"), {
      target: { value: "브랜드가 수정한 상세 문서 본문" }
    });
    fireEvent.click(screen.getByRole("button", { name: "상세 페이지 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.sections[1]).toMatchObject({
      sectionType: "text",
      body: "브랜드가 수정한 상세 문서 본문"
    });
    expect(payload).toHaveProperty("sections");
    expect(payload).not.toHaveProperty("shortDescription");
    expect(payload).not.toHaveProperty("description");
    expect(payload).not.toHaveProperty("priceUsd");
    expect(payload).not.toHaveProperty("sku");
    expect(payload).not.toHaveProperty("stockQuantity");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("brandName");
  });

  it("persists selected text appearance settings in the detail payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "product_1", name: "Glow Set" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BrandProductDetailEditor product={productFixture()} />);
    fireEvent.change(screen.getByLabelText("텍스트 글자 크기"), {
      target: { value: "hero" }
    });
    fireEvent.click(screen.getByRole("button", { name: "텍스트 글자색 핑크" }));
    fireEvent.click(screen.getByRole("button", { name: "상세 페이지 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.sections[0]).toMatchObject({
      sectionType: "heading",
      fontSize: "hero",
      textColor: "pink"
    });
  });

  it("selects and reorders detail sections from blocks beyond the first one", () => {
    render(<BrandProductDetailEditor product={productFixture()} />);

    expect(screen.getByLabelText("제목 단계")).toBeInTheDocument();

    fireEvent.focusIn(screen.getByLabelText("본문"));

    expect(screen.getByLabelText("본문 굵기")).toBeInTheDocument();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole("button", { name: "섹션 2 문단 선택 및 드래그" }), {
      dataTransfer
    });
    fireEvent.dragOver(screen.getByRole("listitem", { name: "상세 섹션 1: 제목" }), { dataTransfer });
    fireEvent.drop(screen.getByRole("listitem", { name: "상세 섹션 1: 제목" }), { dataTransfer });

    const sectionItems = screen.getAllByRole("listitem", { name: /상세 섹션/ });
    expect(sectionItems[0]).toHaveAccessibleName("상세 섹션 1: 문단");
    expect(screen.getByLabelText("본문 굵기")).toBeInTheDocument();
  });

  it("saves the selected step layout from the inspector", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "product_1", name: "Glow Set" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BrandProductDetailEditor
        product={{
          ...productFixture(),
          detailSections: [
            {
              id: "steps_1",
              sortOrder: 1,
              sectionType: "steps",
              schemaVersion: 1,
              title: "사용 순서",
              layout: "split_cards",
              items: [{ title: "첫 단계", body: "첫 단계 설명" }]
            }
          ]
        }}
      />
    );
    fireEvent.change(screen.getByLabelText("단계 배치"), {
      target: { value: "timeline" }
    });
    fireEvent.click(screen.getByRole("button", { name: "상세 페이지 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionType: "steps",
          layout: "timeline",
          items: [expect.objectContaining({ title: "첫 단계", body: "첫 단계 설명" })]
        })
      ])
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

function productFixture(): Product {
  return {
    id: "product_1",
    slug: "glow-set",
    productType: "set" as const,
    brandName: "Glow Brand",
    name: "Glow Set",
    category: "Skincare",
    difficulty: "Beginner" as const,
    itemCount: 1,
    shortDescription: "기존 요약",
    description: "기존 상세 본문",
    bestFor: "아침 루틴",
    result: "촉촉한 마무리",
    heroImagePath: "/hero.png",
    badges: [],
    tags: ["SKINCARE", "SET"],
    status: "active" as const,
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
  };
}
