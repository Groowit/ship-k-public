import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandProductDetailEditor } from "./brand-product-detail-editor";

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

    expect(screen.getByText("상세 페이지 수정")).toBeInTheDocument();
    expect(screen.getByLabelText("짧은 설명")).toBeInTheDocument();
    expect(screen.getByLabelText("상품 소개 본문")).toBeInTheDocument();
    expect(screen.queryByLabelText("가격 USD")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
    expect(screen.queryByText("판매중으로 발행")).not.toBeInTheDocument();
  });

  it("saves only allowed detail content fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: "product_1", name: "Glow Set" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BrandProductDetailEditor product={productFixture()} />);
    fireEvent.change(screen.getByLabelText("짧은 설명"), {
      target: { value: "브랜드가 수정한 요약" }
    });
    fireEvent.click(screen.getByRole("button", { name: "상세 페이지 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      shortDescription: "브랜드가 수정한 요약",
      description: "기존 상세 본문"
    });
    expect(payload).not.toHaveProperty("priceUsd");
    expect(payload).not.toHaveProperty("sku");
    expect(payload).not.toHaveProperty("stockQuantity");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("brandName");
  });
});

function productFixture() {
  return {
    id: "product_1",
    slug: "glow-set",
    productType: "curated_set" as const,
    brandName: "Glow Brand",
    name: "Glow Set",
    category: "Routine Kit",
    collectionSlug: "daily-glow" as const,
    collectionName: "Daily Glow",
    difficulty: "Beginner" as const,
    itemCount: 1,
    themeLabel: "DAILY",
    shortDescription: "기존 요약",
    description: "기존 상세 본문",
    bestFor: "아침 루틴",
    result: "촉촉한 마무리",
    heroImagePath: "/hero.png",
    badges: [],
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
    contentBlocks: []
  };
}
