"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/commerce";
import type { HomeCurationEntry, HomeCurationNonVisibleReason } from "@/lib/home-curation";
import { getImageOptimizationProps } from "@/lib/image-path";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminHomeCurationClient({
  initialEntries,
  products
}: {
  initialEntries: HomeCurationEntry[];
  products: Product[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(() => sortEntries(initialEntries));
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const curatedProductIds = useMemo(
    () => new Set(entries.map((entry) => entry.productId)),
    [entries]
  );
  const searchResults = useMemo(
    () => filterProducts(products, query).slice(0, 12),
    [products, query]
  );
  const isBusy = saveState === "saving";

  async function addProduct(product: Product) {
    if (curatedProductIds.has(product.id)) {
      setSaveState("error");
      setMessage("이미 큐레이션에 등록된 상품입니다.");
      return;
    }

    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/home-curation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "상품을 큐레이션에 추가하지 못했습니다.");
      }

      setEntries(sortEntries((body.entries as HomeCurationEntry[] | undefined) ?? entries));
      setSaveState("saved");
      setMessage(`${product.name} 상품을 홈 큐레이션에 추가했습니다.`);
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "상품을 큐레이션에 추가하지 못했습니다.");
    }
  }

  async function deleteEntry(entry: HomeCurationEntry) {
    if (!window.confirm(`${entry.product.name} 상품을 홈 큐레이션에서 삭제할까요? 홈에서 바로 사라집니다.`)) {
      return;
    }

    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/home-curation/${entry.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "큐레이션 상품을 삭제하지 못했습니다.");
      }

      const nextEntries =
        (body.entries as HomeCurationEntry[] | undefined) ??
        entries.filter((currentEntry) => currentEntry.id !== entry.id);
      setEntries(sortEntries(nextEntries));
      setSaveState("saved");
      setMessage("큐레이션 상품을 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "큐레이션 상품을 삭제하지 못했습니다.");
    }
  }

  async function moveEntry(id: string, direction: -1 | 1) {
    const fromIndex = entries.findIndex((entry) => entry.id === id);
    const toIndex = fromIndex + direction;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= entries.length) {
      return;
    }

    const nextEntries = [...entries];
    const [movedEntry] = nextEntries.splice(fromIndex, 1);
    nextEntries.splice(toIndex, 0, movedEntry);

    setSaveState("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/home-curation/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextEntries.map((entry) => entry.id) })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "큐레이션 순서를 저장하지 못했습니다.");
      }

      setEntries(sortEntries((body.entries as HomeCurationEntry[] | undefined) ?? nextEntries));
      setSaveState("saved");
      setMessage("큐레이션 순서를 저장했습니다.");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "큐레이션 순서를 저장하지 못했습니다.");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
      <section className="grid content-start gap-4">
        <div className="rounded-md border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold tracking-normal">홈 노출 순서</h3>
              <p className="text-sm text-muted-foreground">
                {entries.length}개 등록 · 홈에는 판매중/재고 있음 상품만 노출
              </p>
            </div>
            <Badge className="rounded-md">즉시 반영</Badge>
          </div>
          {message ? (
            <p
              role="status"
              className={cn(
                "mt-4 rounded-md border p-3 text-sm",
                saveState === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted"
              )}
              data-testid="admin-home-curation-message"
            >
              {message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3" role="list" aria-label="홈 큐레이션 상품 목록">
          {entries.length ? (
            entries.map((entry, index) => (
              <article
                key={entry.id}
                role="listitem"
                className="grid gap-3 rounded-md border bg-white p-3"
                data-testid="admin-home-curation-entry"
              >
                <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
                  <ProductThumb product={entry.product} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase text-muted-foreground">
                      {index + 1}. {getProductTypeLabel(entry.product.productType)} / {entry.product.category}
                    </p>
                    <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-5">
                      {entry.product.name}
                    </h4>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {entry.product.brandName} · SKU {entry.product.option.sku}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.nonVisibleReasons.length ? (
                        entry.nonVisibleReasons.map((reason) => (
                          <Badge key={reason} className="rounded-md bg-amber-100 text-amber-950 hover:bg-amber-100">
                            {getNonVisibleReasonLabel(reason)}
                          </Badge>
                        ))
                      ) : (
                        <Badge className="rounded-md bg-emerald-100 text-emerald-950 hover:bg-emerald-100">
                          홈 노출 가능
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <IconButton
                    label={`${entry.product.name} 위로 이동`}
                    disabled={index === 0 || isBusy}
                    onClick={() => moveEntry(entry.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`${entry.product.name} 아래로 이동`}
                    disabled={index === entries.length - 1 || isBusy}
                    onClick={() => moveEntry(entry.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="ml-auto"
                    disabled={isBusy}
                    onClick={() => deleteEntry(entry)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    삭제
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border bg-white p-8 text-center text-sm text-muted-foreground">
              등록된 홈 큐레이션 상품이 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="grid content-start gap-4">
        <div className="rounded-md border bg-white p-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold">상품 검색</span>
            <span className="grid h-11 grid-cols-[auto_1fr] items-center gap-2 rounded-md border bg-white px-3">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-full border-0 px-0 shadow-none focus-visible:ring-0"
                placeholder="상품명, 브랜드, SKU, 카테고리"
                aria-label="큐레이션에 추가할 상품 검색"
              />
            </span>
          </label>
        </div>

        <div className="grid gap-3" role="list" aria-label="큐레이션 추가 가능 상품">
          {searchResults.length ? (
            searchResults.map((product) => {
              const isCurated = curatedProductIds.has(product.id);
              return (
                <article
                  key={product.id}
                  role="listitem"
                  className="grid gap-3 rounded-md border bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
                    <ProductThumb product={product} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase text-muted-foreground">
                        {getProductTypeLabel(product.productType)} / {product.category}
                      </p>
                      <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-5">
                        {product.name}
                      </h4>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {product.brandName} · SKU {product.option.sku}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {formatUsd(product.option.priceCents)} · {getStatusLabel(product.status)} · 재고 {product.option.stockQuantity}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="justify-self-start md:justify-self-end"
                    disabled={isBusy || isCurated}
                    onClick={() => addProduct(product)}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {isCurated ? "등록됨" : "추가"}
                  </Button>
                </article>
              );
            })
          ) : (
            <div className="rounded-md border bg-white p-8 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductThumb({ product }: { product: Product }) {
  return (
    <span className="relative block aspect-square overflow-hidden rounded-md border bg-muted">
      <Image
        src={product.heroImagePath}
        alt=""
        fill
        {...getImageOptimizationProps(product.heroImagePath)}
        sizes="72px"
        className="object-cover"
      />
    </span>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function filterProducts(products: Product[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

  if (!normalizedQuery) {
    return sortedProducts;
  }

  return sortedProducts.filter((product) =>
    [
      product.name,
      product.brandName,
      product.option.sku,
      product.category,
      product.productType,
      ...product.tags,
      ...product.badges
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

function sortEntries(entries: HomeCurationEntry[]) {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.product.name.localeCompare(b.product.name));
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

function getNonVisibleReasonLabel(reason: HomeCurationNonVisibleReason) {
  const labels: Record<HomeCurationNonVisibleReason, string> = {
    draft: "임시저장",
    archived: "보관됨",
    out_of_stock: "품절"
  };

  return labels[reason];
}
