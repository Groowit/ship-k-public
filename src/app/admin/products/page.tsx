import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { ExternalLink, Eye, PencilLine, Plus, Search, SlidersHorizontal } from "lucide-react";
import { AdminProductDeleteButton, AdminProductHideButton } from "@/components/admin-product-delete-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { formatUsd } from "@/lib/commerce";
import { listProducts } from "@/lib/commerce-store";
import { getImageOptimizationProps } from "@/lib/image-path";
import { Product, productCategories } from "@/lib/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!(await requireAdminPageAccess("/admin/products"))) {
    return null;
  }

  const products = filterProducts(await listProducts(), params);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">상품 관리자</h2>
          <p className="text-sm text-muted-foreground">
            세트와 단품의 판매 정보, 미디어, 발행 준비 상태를 관리합니다.
          </p>
        </div>
        <Link href="/admin/products/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          새 상품
        </Link>
      </div>
      <ProductFilters params={params} />
      <div data-testid="admin-products-list" className="grid gap-3" role="list" aria-label="관리자 상품 목록">
        {products.length ? (
          products.map((product) => (
            <article
              key={product.id}
              className="grid min-w-0 gap-4 rounded-md border bg-white p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_13rem] lg:items-center"
              role="listitem"
            >
              <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
                <Image
                  src={product.heroImagePath}
                  alt=""
                  width={72}
                  height={72}
                  {...getImageOptimizationProps(product.heroImagePath)}
                  className="aspect-square rounded-md border object-cover"
                />
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-base font-bold leading-6">{product.name}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{product.brandName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">SKU {product.option.sku ?? "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.badges.map((badge) => (
                      <span key={badge} className="rounded-md bg-[#793de1] px-2 py-1 text-[11px] font-black text-[#fff75f]">
                        {badge}
                      </span>
                    ))}
                    {product.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[11px] font-black text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <ProductMeta label="유형">
                  <span className="whitespace-nowrap break-keep" data-testid={`admin-product-type-${product.id}`}>
                    {getProductTypeLabel(product.productType)}
                  </span>
                </ProductMeta>
                <ProductMeta label="카테고리">
                  <span className="whitespace-nowrap break-keep">{product.category}</span>
                </ProductMeta>
                <ProductMeta label="가격">
                  <span className="font-semibold">{formatUsd(product.option.priceCents)}</span>
                </ProductMeta>
                <ProductMeta label="재고">
                  {product.option.stockQuantity === 0 ? (
                    <Badge className="whitespace-nowrap">품절</Badge>
                  ) : (
                    <span className="font-semibold">{product.option.stockQuantity}</span>
                  )}
                </ProductMeta>
                <ProductMeta label="상태">
                  <Badge className="whitespace-nowrap break-keep">{getStatusLabel(product.status)}</Badge>
                </ProductMeta>
                <ProductMeta label="수정일">
                  <span className="whitespace-nowrap text-muted-foreground">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("ko-KR") : "-"}
                  </span>
                </ProductMeta>
              </dl>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "whitespace-nowrap px-2 text-xs font-semibold")}
                  href={`/admin/products/${product.id}`}
                  aria-label={`${product.name} 수정`}
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  수정
                </Link>
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "whitespace-nowrap px-2 text-xs font-semibold")}
                  href={`/admin/products/${product.id}/preview`}
                  aria-label={`${product.name} 미리보기`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  미리보기
                </Link>
                {product.status !== "archived" ? (
                  <AdminProductHideButton
                    productId={product.id}
                    productName={product.name}
                    className="whitespace-nowrap px-2 text-xs font-semibold"
                  />
                ) : null}
                <AdminProductDeleteButton
                  productId={product.id}
                  productName={product.name}
                  className="whitespace-nowrap px-2 text-xs font-semibold"
                />
                {product.status === "active" ? (
                  <Link
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "col-span-2 whitespace-nowrap px-2 text-xs font-semibold lg:col-span-1"
                    )}
                    href={`/products/${product.slug}`}
                    aria-label={`${product.name} 공개 페이지`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    공개 페이지
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-md border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
            조건에 맞는 상품이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function ProductMeta({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 truncate">{children}</dd>
    </div>
  );
}

function ProductFilters({
  params
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const status = getParam(params.status, "all");
  const type = getParam(params.type, "all");
  const category = getParam(params.category, "all");
  const difficulty = getParam(params.difficulty, "all");
  const stock = getParam(params.stock, "all");

  return (
    <form
      id="admin-product-filters"
      data-testid="admin-product-filters"
      className="rounded-md border bg-white p-4 text-sm"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[16rem] flex-[2_1_18rem] gap-2">
          <span className="text-xs font-black text-muted-foreground">검색</span>
          <span className="grid h-11 grid-cols-[auto_1fr] items-center gap-2 rounded-md border bg-white px-3">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              name="q"
              defaultValue={getParam(params.q, "")}
              className="h-full min-w-0 border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
              placeholder="상품명, 브랜드, SKU"
            />
          </span>
        </label>
        <FilterSelect name="status" label="상태" value={status} options={["all", "draft", "active", "archived"]} />
        <FilterSelect name="type" label="유형" value={type} options={["all", "set", "single"]} />
        <FilterSelect
          name="category"
          label="카테고리"
          value={category}
          options={["all", ...productCategories]}
        />
        <FilterSelect name="difficulty" label="난이도" value={difficulty} options={["all", "Beginner", "Intermediate"]} />
        <FilterSelect name="stock" label="재고" value={stock} options={["all", "in_stock", "out_of_stock"]} />
        <button className={cn(buttonVariants({ variant: "outline" }), "h-11 shrink-0 whitespace-nowrap px-4")} type="submit">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          필터 적용
        </button>
      </div>
    </form>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="grid min-w-[7rem] flex-[1_1_7.5rem] gap-2">
      <span className="text-xs font-black text-muted-foreground">{label}</span>
      <select name={name} defaultValue={value} className="h-11 min-w-0 rounded-md border bg-white px-3 text-sm font-semibold">
        {options.map((option) => (
          <option key={option} value={option}>
            {getFilterOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function filterProducts(
  products: Product[],
  params: Record<string, string | string[] | undefined>
) {
  const query = getParam(params.q, "").toLowerCase();
  const status = getParam(params.status, "all");
  const type = getParam(params.type, "all");
  const category = getParam(params.category, "all");
  const difficulty = getParam(params.difficulty, "all");
  const stock = getParam(params.stock, "all");

  return products.filter((product) => {
    const matchesQuery =
      !query ||
      [product.name, product.brandName, product.option.sku, ...product.tags, ...product.badges]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus = status === "all" || product.status === status;
    const matchesType = type === "all" || product.productType === type;
    const matchesCategory = category === "all" || product.category === category;
    const matchesDifficulty = difficulty === "all" || product.difficulty === difficulty;
    const matchesStock =
      stock === "all" ||
      (stock === "in_stock" && product.option.stockQuantity > 0) ||
      (stock === "out_of_stock" && product.option.stockQuantity === 0);

    return matchesQuery && matchesStatus && matchesType && matchesCategory && matchesDifficulty && matchesStock;
  });
}

function getParam(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function getProductTypeLabel(type: Product["productType"]) {
  return type === "set" ? "세트" : "단품";
}

function getStatusLabel(status: Product["status"]) {
  if (status === "active") {
    return "판매중";
  }

  if (status === "archived") {
    return "보관됨";
  }

  return "임시저장";
}

function getFilterOptionLabel(option: string) {
  const labels: Record<string, string> = {
    all: "전체",
    draft: "임시저장",
    active: "판매중",
    archived: "보관됨",
    set: "세트",
    single: "단품",
    Beginner: "초급",
    Intermediate: "중급",
    in_stock: "재고 있음",
    out_of_stock: "품절"
  };

  return labels[option] ?? option;
}
