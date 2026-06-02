"use client";

import {
  Archive,
  AtSign,
  CheckCircle2,
  CircleAlert,
  Link2,
  PackageCheck,
  PauseCircle,
  PencilLine,
  Plus,
  Search,
  UserCog,
  UserPlus,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminBrandSummary, ProductBrandAssignment } from "@/lib/brand-store";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type JsonMethod = "POST" | "PATCH";
type AssignmentOwner = {
  brandId: string;
  brandName: string;
  assignmentId: string;
};

const brandStatusOptions = [
  ["active", "활성"],
  ["paused", "일시중지"],
  ["archived", "보관됨"]
] as const;

const memberRoleOptions = [
  ["owner", "소유자"],
  ["editor", "편집자"],
  ["viewer", "조회자"]
] as const;

const membershipStatusOptions = [
  ["active", "활성"],
  ["paused", "중지"]
] as const;

const assignmentStatusOptions = [
  ["active", "활성"],
  ["paused", "중지"],
  ["archived", "보관"]
] as const;

export function AdminBrandManagementClient({
  brands,
  products
}: {
  brands: AdminBrandSummary[];
  products: Product[];
}) {
  const router = useRouter();
  const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const normalizedQuery = normalizeSearchText(query);
  const filteredBrands = useMemo(
    () => brands.filter((brand) => brandMatchesSearch(brand, normalizedQuery)),
    [brands, normalizedQuery]
  );
  const selectedBrand = useMemo(
    () =>
      filteredBrands.find((brand) => brand.id === selectedBrandId) ??
      (normalizedQuery ? null : brands.find((brand) => brand.id === selectedBrandId) ?? brands[0] ?? null),
    [brands, filteredBrands, normalizedQuery, selectedBrandId]
  );
  const activeAssignmentByProductId = useMemo(() => getActiveAssignmentOwners(brands), [brands]);

  async function submitJson(url: string, payload: Record<string, unknown>, method: JsonMethod = "POST") {
    setState("saving");
    setMessage(null);

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
    }

    setState("saved");
    router.refresh();
    return body;
  }

  async function createBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const body = await submitJson("/api/admin/brands", {
        name: String(form.get("name") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? "") || undefined
      });
      setMessage(`${body.brand.name} 브랜드를 생성했습니다.`);
      setSelectedBrandId(body.brand.id);
      formElement.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "브랜드를 생성하지 못했습니다.");
    }
  }

  async function updateBrand(event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await submitJson(
        `/api/admin/brands/${brand.id}`,
        {
          status: String(form.get("status") ?? brand.status),
          contactEmail: String(form.get("contactEmail") ?? "") || null
        },
        "PATCH"
      );
      setMessage(`${brand.name} 브랜드 운영 정보를 저장했습니다.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "브랜드 운영 정보를 저장하지 못했습니다.");
    }
  }

  async function connectMember(event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await submitJson(`/api/admin/brands/${brand.id}/members`, {
        email: String(form.get("email") ?? ""),
        memberRole: String(form.get("memberRole") ?? "editor")
      });
      setMessage(`${brand.name} 브랜드에 멤버를 연결했습니다.`);
      formElement.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "브랜드 멤버를 연결하지 못했습니다.");
    }
  }

  async function updateMember(event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await submitJson(
        `/api/admin/brands/${brand.id}/members`,
        {
          membershipId: String(form.get("membershipId") ?? ""),
          memberRole: String(form.get("memberRole") ?? "editor"),
          status: String(form.get("status") ?? "active")
        },
        "PATCH"
      );
      setMessage("브랜드 멤버 권한을 저장했습니다.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "브랜드 멤버 권한을 저장하지 못했습니다.");
    }
  }

  async function assignProduct(event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await submitJson(`/api/admin/brands/${brand.id}/products`, {
        productId: String(form.get("productId") ?? "")
      });
      setMessage(`${brand.name} 브랜드에 상품을 배정했습니다.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "상품을 배정하지 못했습니다.");
    }
  }

  async function updateAssignment(event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await submitJson(
        `/api/admin/brands/${brand.id}/products`,
        {
          assignmentId: String(form.get("assignmentId") ?? ""),
          status: String(form.get("status") ?? "active"),
          canEditDetails: form.get("canEditDetails") === "on"
        },
        "PATCH"
      );
      setMessage("상품 배정 상태를 저장했습니다.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "상품 배정 상태를 저장하지 못했습니다.");
    }
  }

  const isSaving = state === "saving";

  return (
    <div className="grid gap-5">
      <section className="rounded-md border bg-white p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)] xl:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            브랜드 검색
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-md border px-9 font-normal"
                placeholder="브랜드명, 슬러그, 이메일 검색"
                aria-label="브랜드 검색"
              />
            </span>
          </label>

          <form onSubmit={createBrand} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-semibold">
              브랜드 파트너명
              <input
                name="name"
                className="h-11 rounded-md border px-3 font-normal"
                required
                placeholder="예: Glow Brand"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              대표 이메일
              <input
                name="contactEmail"
                className="h-11 rounded-md border px-3 font-normal"
                type="email"
                placeholder="owner@example.com"
              />
            </label>
            <Button type="submit" disabled={isSaving}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              브랜드 파트너 생성
            </Button>
          </form>
        </div>
      </section>

      {message ? (
        <p
          role="status"
          className={cn(
            "rounded-md border p-3 text-sm",
            state === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-white"
          )}
        >
          {message}
        </p>
      ) : null}

      <section className="rounded-md border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <p className="font-semibold">브랜드 목록</p>
          <p className="text-sm text-muted-foreground">
            {filteredBrands.length} / {brands.length}
          </p>
        </div>
        <div className="divide-y">
          {filteredBrands.length ? (
            filteredBrands.map((brand) => (
              <BrandListRow
                key={brand.id}
                brand={brand}
                isSelected={selectedBrand?.id === brand.id}
                onSelect={() => setSelectedBrandId(brand.id)}
              />
            ))
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {brands.length ? "검색 결과가 없습니다." : "등록된 브랜드가 없습니다."}
            </p>
          )}
        </div>
      </section>

      <div role="separator" aria-label="브랜드 목록과 상세 구분선" className="flex items-center gap-3 py-3">
        <span className="h-0 flex-1 border-t-2 border-foreground/70" />
        <span className="shrink-0 text-sm font-semibold text-muted-foreground">브랜드 상세 보기</span>
        <span className="h-0 flex-1 border-t-2 border-foreground/70" />
      </div>

      <section aria-label="선택한 브랜드 상세">
        {selectedBrand ? (
          <BrandWorkspace
            brand={selectedBrand}
            products={products}
            activeAssignmentByProductId={activeAssignmentByProductId}
            isSaving={isSaving}
            onUpdateBrand={updateBrand}
            onConnectMember={connectMember}
            onUpdateMember={updateMember}
            onAssignProduct={assignProduct}
            onUpdateAssignment={updateAssignment}
          />
        ) : (
          <div className="rounded-md border bg-white p-8 text-center text-muted-foreground">
            {brands.length ? "검색 결과에서 관리할 브랜드를 선택해주세요." : "관리할 브랜드를 생성해주세요."}
          </div>
        )}
      </section>
    </div>
  );
}

function BrandListRow({
  brand,
  isSelected,
  onSelect
}: {
  brand: AdminBrandSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const activeMembers = brand.memberships.filter((membership) => membership.status === "active");
  const activeAssignments = brand.assignments.filter((assignment) => assignment.status === "active");
  const warningCount = getBrandWarningCount(brand);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      data-testid={`brand-row-${brand.id}`}
      className={cn(
        "grid w-full gap-3 px-4 py-4 text-left transition hover:bg-muted/50 md:grid-cols-[minmax(180px,1.35fr)_minmax(170px,1fr)_120px_120px_120px] md:items-center",
        isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/40"
      )}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold">{brand.name}</span>
          <StatusBadge status={brand.status} />
          {isSelected ? <Badge>선택됨</Badge> : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{brand.slug}</span>
      </span>
      <span className="min-w-0 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <AtSign className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{brand.contactEmail ?? "대표 이메일 없음"}</span>
        </span>
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" aria-hidden="true" />
        <span>
          {activeMembers.length} / {brand.memberships.length} 멤버
        </span>
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <PackageCheck className="h-4 w-4" aria-hidden="true" />
        <span>
          {activeAssignments.length} / {brand.assignments.length} 상품
        </span>
      </span>
      <span className={cn("flex items-center gap-2 text-sm", warningCount ? "text-destructive" : "text-muted-foreground")}>
        <CircleAlert className="h-4 w-4" aria-hidden="true" />
        <span>{warningCount ? `${warningCount} 점검` : "정상"}</span>
      </span>
    </button>
  );
}

function BrandWorkspace({
  brand,
  products,
  activeAssignmentByProductId,
  isSaving,
  onUpdateBrand,
  onConnectMember,
  onUpdateMember,
  onAssignProduct,
  onUpdateAssignment
}: {
  brand: AdminBrandSummary;
  products: Product[];
  activeAssignmentByProductId: Map<string, AssignmentOwner>;
  isSaving: boolean;
  onUpdateBrand: (event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) => void;
  onConnectMember: (event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) => void;
  onUpdateMember: (event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) => void;
  onAssignProduct: (event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) => void;
  onUpdateAssignment: (event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) => void;
}) {
  const activeMembers = brand.memberships.filter((membership) => membership.status === "active");
  const activeAssignments = brand.assignments.filter((assignment) => assignment.status === "active");
  const unassignedProducts = products.filter((product) => !activeAssignmentByProductId.has(product.id));
  const assignedElsewhereProducts = products.filter((product) => {
    const owner = activeAssignmentByProductId.get(product.id);
    return owner && owner.brandId !== brand.id;
  });
  const assignedHereProducts = products.filter((product) => {
    const owner = activeAssignmentByProductId.get(product.id);
    return owner?.brandId === brand.id;
  });
  const healthChecks = getBrandHealthChecks(brand);

  return (
    <main className="grid gap-4">
      <section className="rounded-md border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-xl font-bold tracking-normal">{brand.name}</h3>
              <StatusBadge status={brand.status} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{brand.slug}</p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Pill icon={Users} label={`${activeMembers.length} 활성 멤버`} />
            <Pill icon={PackageCheck} label={`${activeAssignments.length} 활성 상품`} />
            <Pill icon={AtSign} label={brand.contactEmail ?? "대표 이메일 없음"} />
          </div>
        </div>

        <form
          key={brand.id}
          onSubmit={(event) => onUpdateBrand(event, brand)}
          className="mt-4 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-end"
        >
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            상태
            <select
              name="status"
              defaultValue={brand.status}
              className="h-11 w-full min-w-0 rounded-md border bg-white px-3 font-normal"
            >
              {brandStatusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            대표 이메일
            <input
              name="contactEmail"
              defaultValue={brand.contactEmail ?? ""}
              className="h-11 w-full min-w-0 rounded-md border px-3 font-normal"
              type="email"
              placeholder="owner@example.com"
            />
          </label>
          <Button className="w-full whitespace-nowrap md:w-auto" type="submit" variant="outline" disabled={isSaving}>
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            운영 정보 저장
          </Button>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <section className="rounded-md border bg-white">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="font-semibold">멤버 권한</p>
              <p className="text-xs text-muted-foreground">브랜드 대시보드 접근 권한을 관리합니다.</p>
            </div>
            <Badge>{brand.memberships.length}</Badge>
          </div>
          <form
            onSubmit={(event) => onConnectMember(event, brand)}
            className="grid gap-3 border-b bg-muted/20 px-4 py-3 lg:grid-cols-[minmax(220px,1fr)_160px_auto] lg:items-end"
          >
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              고객 계정 이메일
              <input
                name="email"
                type="email"
                className="h-11 w-full min-w-0 rounded-md border bg-white px-3 font-normal"
                required
                placeholder="customer@example.com"
              />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              역할
              <select
                name="memberRole"
                className="h-11 w-full min-w-0 rounded-md border bg-white px-3 font-normal"
                defaultValue="editor"
              >
                {memberRoleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
              ))}
            </select>
          </label>
            <Button className="w-full whitespace-nowrap lg:w-auto" type="submit" variant="outline" disabled={isSaving}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              멤버 연결
            </Button>
          </form>

          <div className="divide-y">
            {brand.memberships.length ? (
              brand.memberships.map((membership) => (
                <form
                  key={membership.id}
                  onSubmit={(event) => onUpdateMember(event, brand)}
                  className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(130px,160px)_minmax(130px,160px)_auto] lg:items-end"
                >
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <div className="min-w-0">
                    <p className="break-all font-semibold sm:break-normal lg:truncate">
                      {membership.email ?? membership.profileId}
                    </p>
                    {membership.fullName ? <p className="text-xs text-muted-foreground">{membership.fullName}</p> : null}
                  </div>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
                    역할
                    <select
                      name="memberRole"
                      defaultValue={membership.memberRole}
                      className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm font-normal text-foreground"
                    >
                      {memberRoleOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
                    상태
                    <select
                      name="status"
                      defaultValue={membership.status}
                      className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm font-normal text-foreground"
                    >
                      {membershipStatusOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button className="w-full whitespace-nowrap lg:w-auto" type="submit" size="sm" variant="outline" disabled={isSaving}>
                    <UserCog className="h-4 w-4" aria-hidden="true" />
                    저장
                  </Button>
                </form>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">
                연결된 멤버 없음
              </p>
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-md border bg-white">
            <div className="border-b px-4 py-3">
              <p className="font-semibold">상태 점검</p>
              <p className="text-xs text-muted-foreground">운영자가 확인해야 할 브랜드 상태입니다.</p>
            </div>
            <div className="divide-y">
              {healthChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{check.label}</p>
                    <p className={cn("mt-0.5 text-sm", check.tone === "warning" ? "text-destructive" : "text-muted-foreground")}>
                      {check.value}
                    </p>
                  </div>
                  {check.tone === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border bg-white">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-semibold">상품 연결</p>
                <p className="text-xs text-muted-foreground">배정 상태를 확인하고 이관합니다.</p>
              </div>
              <Badge>{brand.assignments.length}</Badge>
            </div>
            <form onSubmit={(event) => onAssignProduct(event, brand)} className="grid gap-3 border-b bg-muted/20 px-4 py-3">
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                배정 감사/이관 상품
                <select
                  name="productId"
                  className="h-11 w-full min-w-0 rounded-md border bg-white px-3 font-normal"
                  required
                  defaultValue=""
                >
                  <option value="">상품 선택</option>
                  {unassignedProducts.length ? (
                    <optgroup label="미배정 상품">
                      {unassignedProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} / {product.brandName}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {assignedElsewhereProducts.length ? (
                    <optgroup label="다른 브랜드 배정 상품">
                      {assignedElsewhereProducts.map((product) => {
                        const owner = activeAssignmentByProductId.get(product.id);
                        return (
                          <option key={product.id} value={product.id}>
                            {product.name} / 현재 {owner?.brandName}
                          </option>
                        );
                      })}
                    </optgroup>
                  ) : null}
                  {assignedHereProducts.length ? (
                    <optgroup label="현재 브랜드 상품">
                      {assignedHereProducts.map((product) => (
                        <option key={product.id} value={product.id} disabled>
                          {product.name} / 이미 배정됨
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
              <Button className="w-full whitespace-nowrap" type="submit" variant="outline" disabled={isSaving || products.length === 0}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                이관/연결
              </Button>
            </form>

            <div className="divide-y">
              {brand.assignments.length ? (
                brand.assignments.map((assignment) => (
                  <AssignedProductRow
                    key={assignment.id}
                    assignment={assignment}
                    brand={brand}
                    isSaving={isSaving}
                    onUpdateAssignment={onUpdateAssignment}
                  />
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">배정 상품 없음</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function AssignedProductRow({
  assignment,
  brand,
  isSaving,
  onUpdateAssignment
}: {
  assignment: ProductBrandAssignment;
  brand: AdminBrandSummary;
  isSaving: boolean;
  onUpdateAssignment: (event: FormEvent<HTMLFormElement>, brand: AdminBrandSummary) => void;
}) {
  const product = assignment.product;
  const hasBrandMismatch = isCatalogBrandMismatch(brand, assignment);

  return (
    <form
      onSubmit={(event) => onUpdateAssignment(event, brand)}
      className="grid gap-3 px-4 py-3"
    >
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 break-words font-semibold">{product?.name ?? assignment.productId}</p>
          <StatusBadge status={assignment.status} />
        </div>
        {product ? (
          <p className={cn("mt-1 text-xs text-muted-foreground", hasBrandMismatch ? "text-destructive" : "")}>
            카탈로그 브랜드: {product.brandName}
          </p>
        ) : null}
      </div>
      <label className="grid min-w-0 gap-1 text-xs font-semibold text-muted-foreground">
        배정 상태
        <select
          name="status"
          defaultValue={assignment.status}
          className="h-10 w-full min-w-0 rounded-md border bg-white px-3 text-sm font-normal text-foreground"
        >
          {assignmentStatusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
          </option>
        ))}
      </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold">
          <input name="canEditDetails" type="checkbox" defaultChecked={assignment.canEditDetails} />
          <span className="truncate">상세 편집 허용</span>
        </label>
        <Button className="w-full whitespace-nowrap sm:w-auto" type="submit" size="sm" variant="outline" disabled={isSaving}>
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          저장
        </Button>
      </div>
    </form>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-md border bg-muted px-3 py-2">
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "active" ? CheckCircle2 : status === "paused" ? PauseCircle : Archive;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
        status === "active" && "bg-emerald-50 text-emerald-700",
        status === "paused" && "bg-amber-50 text-amber-700",
        status === "archived" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
}

function getActiveAssignmentOwners(brands: AdminBrandSummary[]) {
  const owners = new Map<string, AssignmentOwner>();

  for (const brand of brands) {
    for (const assignment of brand.assignments) {
      if (assignment.status === "active") {
        owners.set(assignment.productId, {
          brandId: brand.id,
          brandName: brand.name,
          assignmentId: assignment.id
        });
      }
    }
  }

  return owners;
}

function brandMatchesSearch(brand: AdminBrandSummary, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  const searchableText = normalizeSearchText(
    [
      brand.name,
      brand.slug,
      brand.contactEmail,
      ...brand.memberships.flatMap((membership) => [membership.email, membership.fullName, membership.profileId]),
      ...brand.assignments.flatMap((assignment) => [
        assignment.product?.name,
        assignment.product?.brandName,
        assignment.product?.slug,
        assignment.productId
      ])
    ]
      .filter(Boolean)
      .join(" ")
  );

  return searchableText.includes(normalizedQuery);
}

function getBrandWarningCount(brand: AdminBrandSummary) {
  return getBrandHealthChecks(brand).filter((check) => check.tone === "warning").length;
}

function getBrandHealthChecks(brand: AdminBrandSummary) {
  const activeMembers = brand.memberships.filter((membership) => membership.status === "active");
  const owners = activeMembers.filter((membership) => membership.memberRole === "owner");
  const activeAssignments = brand.assignments.filter((assignment) => assignment.status === "active");
  const mismatchedAssignments = activeAssignments.filter((assignment) => isCatalogBrandMismatch(brand, assignment));

  return [
    {
      label: "소유자",
      value: owners.length ? `${owners.length}명` : "필요",
      tone: owners.length ? "ok" : "warning"
    },
    {
      label: "활성 멤버",
      value: activeMembers.length ? `${activeMembers.length}명` : "없음",
      tone: activeMembers.length ? "ok" : "warning"
    },
    {
      label: "활성 상품",
      value: activeAssignments.length ? `${activeAssignments.length}개` : "없음",
      tone: activeAssignments.length ? "ok" : "warning"
    },
    {
      label: "표시 브랜드명 일치",
      value: mismatchedAssignments.length ? `${mismatchedAssignments.length}개 확인` : "정상",
      tone: mismatchedAssignments.length ? "warning" : "ok"
    }
  ] as const;
}

function isCatalogBrandMismatch(brand: AdminBrandSummary, assignment: ProductBrandAssignment) {
  if (!assignment.product) {
    return false;
  }

  return normalizeBrandName(assignment.product.brandName) !== normalizeBrandName(brand.name);
}

function normalizeBrandName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getStatusLabel(status: string) {
  if (status === "paused") {
    return "일시중지";
  }

  if (status === "archived") {
    return "보관됨";
  }

  return "활성";
}
