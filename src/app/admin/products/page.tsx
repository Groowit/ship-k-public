import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { formatUsd } from "@/lib/commerce";
import { listProducts } from "@/lib/mvp-store";
import { Product, productCollections } from "@/lib/products";
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
            큐레이션 세트, 임시저장 미리보기, 미디어, 발행 준비 상태를 관리합니다.
          </p>
        </div>
        <Link href="/admin/products/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          새 상품
        </Link>
      </div>
      <ProductFilters params={params} />
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">상품</th>
              <th className="px-4 py-3">유형</th>
              <th className="px-4 py-3">컬렉션</th>
              <th className="px-4 py-3">가격</th>
              <th className="px-4 py-3">재고</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">수정일</th>
              <th className="px-4 py-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {products.length ? (
              products.map((product) => (
                <tr key={product.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="grid grid-cols-[56px_1fr] items-center gap-3">
                      <Image
                        src={product.heroImagePath}
                        alt=""
                        width={56}
                        height={56}
                        className="aspect-square rounded-md border object-cover"
                      />
                      <span>
                        <span className="block font-semibold">{product.name}</span>
                        <span className="block text-xs text-muted-foreground">{product.brandName}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getProductTypeLabel(product.productType)}</td>
                  <td className="px-4 py-3">{product.collectionName ?? "-"}</td>
                  <td className="px-4 py-3">{formatUsd(product.option.priceCents)}</td>
                  <td className="px-4 py-3">
                    {product.option.stockQuantity === 0 ? (
                      <Badge>품절</Badge>
                    ) : (
                      product.option.stockQuantity
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge>{getStatusLabel(product.status)}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link className="font-semibold underline" href={`/admin/products/${product.id}`}>
                        수정
                      </Link>
                      <Link className="font-semibold underline" href={`/admin/products/${product.id}/preview`}>
                        미리보기
                      </Link>
                      {product.status === "active" ? (
                        <Link className="font-semibold underline" href={`/products/${product.slug}`}>
                          공개 페이지
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  조건에 맞는 상품이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  const collection = getParam(params.collection, "all");
  const difficulty = getParam(params.difficulty, "all");
  const stock = getParam(params.stock, "all");

  return (
    <div className="grid gap-3 rounded-md border bg-white p-4 text-sm md:grid-cols-[1fr_repeat(5,auto)] md:items-end">
      <label className="grid gap-2">
        <span className="font-semibold">검색</span>
        <input
          name="q"
          defaultValue={getParam(params.q, "")}
          form="admin-product-filters"
          className="h-10 rounded-md border px-3"
          placeholder="상품명, 브랜드, SKU"
        />
      </label>
      <FilterSelect name="status" label="상태" value={status} options={["all", "draft", "active", "archived"]} />
      <FilterSelect name="type" label="유형" value={type} options={["all", "curated_set", "single"]} />
      <FilterSelect
        name="collection"
        label="컬렉션"
        value={collection}
        options={["all", ...productCollections.map((item) => item.slug)]}
      />
      <FilterSelect name="difficulty" label="난이도" value={difficulty} options={["all", "Beginner", "Intermediate"]} />
      <FilterSelect name="stock" label="재고" value={stock} options={["all", "in_stock", "out_of_stock"]} />
      <form id="admin-product-filters" className="contents">
        <button className={cn(buttonVariants({ variant: "outline" }), "md:col-start-6")} type="submit">
          필터 적용
        </button>
      </form>
    </div>
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
    <label className="grid gap-2">
      <span className="font-semibold">{label}</span>
      <select name={name} defaultValue={value} form="admin-product-filters" className="h-10 rounded-md border bg-white px-3">
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
  const collection = getParam(params.collection, "all");
  const difficulty = getParam(params.difficulty, "all");
  const stock = getParam(params.stock, "all");

  return products.filter((product) => {
    const matchesQuery =
      !query ||
      [product.name, product.brandName, product.option.sku]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesStatus = status === "all" || product.status === status;
    const matchesType = type === "all" || product.productType === type;
    const matchesCollection = collection === "all" || product.collectionSlug === collection;
    const matchesDifficulty = difficulty === "all" || product.difficulty === difficulty;
    const matchesStock =
      stock === "all" ||
      (stock === "in_stock" && product.option.stockQuantity > 0) ||
      (stock === "out_of_stock" && product.option.stockQuantity === 0);

    return matchesQuery && matchesStatus && matchesType && matchesCollection && matchesDifficulty && matchesStock;
  });
}

function getParam(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function getProductTypeLabel(type: Product["productType"]) {
  return type === "curated_set" ? "큐레이션 세트" : "단품";
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
    curated_set: "큐레이션 세트",
    single: "단품",
    Beginner: "초급",
    Intermediate: "중급",
    in_stock: "재고 있음",
    out_of_stock: "품절"
  };

  return labels[option] ?? productCollections.find((collection) => collection.slug === option)?.name ?? option;
}
