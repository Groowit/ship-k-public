/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { AdminHomeCurationClient } from "./admin-home-curation-client";
import type { HomeCurationEntry } from "@/lib/home-curation";
import type { Product } from "@/lib/products";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => {
    void _fill;
    return <img alt={alt ?? ""} data-unoptimized={unoptimized ? "true" : "false"} {...props} />;
  }
}));

describe("AdminHomeCurationClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders empty state and non-visible reasons", () => {
    render(<AdminHomeCurationClient initialEntries={[]} products={[]} />);

    expect(screen.getByText("등록된 홈 큐레이션 상품이 없습니다.")).toBeVisible();

    render(
      <AdminHomeCurationClient
        initialEntries={[
          entryFixture({ id: "entry_draft", product: productFixture({ id: "draft", name: "Draft", status: "draft" }) }),
          entryFixture({ id: "entry_archived", product: productFixture({ id: "archived", name: "Archived", status: "archived" }) }),
          entryFixture({
            id: "entry_oos",
            product: productFixture({ id: "oos", name: "Out", stockQuantity: 0 })
          })
        ]}
        products={[]}
      />
    );

    expect(screen.getByText("임시저장")).toBeVisible();
    expect(screen.getByText("보관됨")).toBeVisible();
    expect(screen.getByText("품절")).toBeVisible();
  });

  it("filters product search and disables already-curated products", () => {
    render(
      <AdminHomeCurationClient
        initialEntries={[entryFixture({ product: productFixture({ id: "glow", name: "Glow Serum" }) })]}
        products={[
          productFixture({ id: "glow", name: "Glow Serum", option: { sku: "GLOW-SKU" } }),
          productFixture({ id: "tint", name: "Velvet Tint", brandName: "Color Lab", option: { sku: "TINT-SKU" } })
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "등록됨" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("큐레이션에 추가할 상품 검색"), {
      target: { value: "tint" }
    });

    expect(screen.getByText("Velvet Tint")).toBeVisible();
    expect(screen.queryAllByText("Glow Serum")).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("큐레이션에 추가할 상품 검색"), {
      target: { value: "nothing" }
    });

    expect(screen.getByText("검색 결과가 없습니다.")).toBeVisible();
  });

  it("adds a selected product through the API", async () => {
    const product = productFixture({ id: "product_2", name: "New Pick" });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ entries: [entryFixture({ product })] }));

    render(<AdminHomeCurationClient initialEntries={[]} products={[product]} />);

    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-home-curation-message")).toHaveTextContent("홈 큐레이션에 추가했습니다")
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/home-curation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ productId: "product_2" })
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("deletes and reorders curated entries", async () => {
    const first = entryFixture({ id: "entry_1", sortOrder: 1, product: productFixture({ id: "first", name: "First" }) });
    const second = entryFixture({ id: "entry_2", sortOrder: 2, product: productFixture({ id: "second", name: "Second" }) });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ entries: [second, first] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, entries: [second] }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminHomeCurationClient initialEntries={[first, second]} products={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Second 위로 이동" }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-home-curation-message")).toHaveTextContent("큐레이션 순서를 저장했습니다")
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/home-curation/reorder",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ ids: ["entry_2", "entry_1"] })
      })
    );

    const secondEntry = screen
      .getAllByTestId("admin-home-curation-entry")
      .find((entry) => within(entry).queryByText("Second"));
    fireEvent.click(within(secondEntry as HTMLElement).getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(screen.getByTestId("admin-home-curation-message")).toHaveTextContent("큐레이션 상품을 삭제했습니다")
    );
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/home-curation/entry_2", { method: "DELETE" });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function entryFixture(overrides: Partial<HomeCurationEntry> = {}): HomeCurationEntry {
  const product = overrides.product ?? productFixture();
  return {
    id: "entry_1",
    productId: product.id,
    sortOrder: 1,
    product,
    nonVisibleReasons:
      overrides.nonVisibleReasons ??
      (product.status === "draft"
        ? ["draft"]
        : product.status === "archived"
          ? ["archived"]
          : product.option.stockQuantity <= 0
            ? ["out_of_stock"]
            : []),
    ...overrides
  };
}

function productFixture(
  overrides: Partial<Omit<Product, "option">> & {
    option?: Partial<Product["option"]>;
    stockQuantity?: number;
  } = {}
): Product {
  const { option, stockQuantity, ...productOverrides } = overrides;
  const id = overrides.id ?? "product_1";

  return {
    id,
    slug: productOverrides.slug ?? id,
    productType: productOverrides.productType ?? "single",
    brandName: productOverrides.brandName ?? "Glow Brand",
    name: productOverrides.name ?? "Glow Product",
    category: productOverrides.category ?? "Skincare",
    difficulty: productOverrides.difficulty ?? "Beginner",
    shortDescription: productOverrides.shortDescription ?? "Short copy",
    description: productOverrides.description ?? "Long copy",
    heroImagePath: productOverrides.heroImagePath ?? "/hero.png",
    badges: productOverrides.badges ?? [],
    tags: productOverrides.tags ?? ["GLOW"],
    status: productOverrides.status ?? "active",
    option: {
      id: `${id}_option`,
      name: "Default option",
      sku: `${id.toUpperCase()}-SKU`,
      priceCents: 4900,
      stockQuantity: stockQuantity ?? option?.stockQuantity ?? 10,
      ...option
    },
    galleryImages: productOverrides.galleryImages ?? [],
    includedItems: productOverrides.includedItems ?? [],
    routineSteps: productOverrides.routineSteps ?? [],
    contentBlocks: productOverrides.contentBlocks ?? [],
    detailSections: productOverrides.detailSections ?? [],
    ...productOverrides
  };
}
