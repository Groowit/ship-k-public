/* eslint-disable @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import AdminProductsPage from "./page";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listProducts } from "@/lib/commerce-store";
import type { Product } from "@/lib/products";

const refresh = vi.fn();

vi.mock("next/image", () => ({
  default: ({
    alt,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    <img
      alt={alt ?? ""}
      data-testid="next-image"
      data-unoptimized={unoptimized ? "true" : "false"}
      {...props}
    />
  )
}));

vi.mock("@/lib/admin-page-auth", () => ({
  requireAdminPageAccess: vi.fn()
}));

vi.mock("@/lib/commerce-store", () => ({
  listProducts: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh
  })
}));

describe("AdminProductsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not load products when admin access is denied", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(false);

    await expect(AdminProductsPage({ searchParams: Promise.resolve({}) })).resolves.toBeNull();
    expect(listProducts).not.toHaveBeenCalled();
  });

  it("renders edit actions as direct product edit links", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listProducts).mockResolvedValue([productFixture()]);

    render(await AdminProductsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("admin-product-filters")).toBeVisible();
    expect(screen.getByTestId("admin-products-list")).toBeVisible();
    expect(screen.getByTestId("admin-product-type-product_1")).toHaveClass("whitespace-nowrap");
    expect(screen.getByRole("link", { name: "Glow Set 수정" })).toHaveAttribute(
      "href",
      "/admin/products/product_1"
    );
    expect(screen.getByRole("link", { name: "Glow Set 미리보기" })).toHaveAttribute(
      "href",
      "/admin/products/product_1/preview"
    );
  });

  it("deletes a product from the list after admin confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listProducts).mockResolvedValue([productFixture()]);

    render(await AdminProductsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole("button", { name: "Glow Set 삭제" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/products/product_1", { method: "DELETE" })
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("hides a product from the list without hard deleting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listProducts).mockResolvedValue([productFixture()]);

    render(await AdminProductsPage({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole("button", { name: "Glow Set 숨기기" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/products/product_1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" })
      })
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders remote product thumbnails without the Next.js optimizer", async () => {
    vi.mocked(requireAdminPageAccess).mockResolvedValue(true);
    vi.mocked(listProducts).mockResolvedValue([
      productFixture({ heroImagePath: "https://example.com/admin-product.png" })
    ]);

    render(await AdminProductsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("next-image")).toHaveAttribute("data-unoptimized", "true");
  });
});

function productFixture(overrides: Partial<Product> = {}): Product {
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
	    status: "draft",
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
    detailSections: [],
    ...overrides
  };
}
