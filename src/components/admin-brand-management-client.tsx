"use client";

import { Link2, Plus, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AdminBrandSummary } from "@/lib/brand-store";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminBrandManagementClient({
  brands,
  products
}: {
  brands: AdminBrandSummary[];
  products: Product[];
}) {
  const router = useRouter();
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submitJson(url: string, payload: Record<string, unknown>) {
    setState("saving");
    setMessage(null);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
    }

    setState("saved");
    router.refresh();
    return body;
  }

  async function createBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const body = await submitJson("/api/admin/brands", {
        name: String(form.get("name") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? "") || undefined
      });
      setMessage(`${body.brand.name} 브랜드를 생성했습니다.`);
      event.currentTarget.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "브랜드를 생성하지 못했습니다.");
    }
  }

  async function connectMember(event: FormEvent<HTMLFormElement>, brandId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await submitJson(`/api/admin/brands/${brandId}/members`, {
        email: String(form.get("email") ?? ""),
        memberRole: String(form.get("memberRole") ?? "editor")
      });
      setMessage("브랜드 멤버를 연결했습니다.");
      event.currentTarget.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "브랜드 멤버를 연결하지 못했습니다.");
    }
  }

  async function assignProduct(event: FormEvent<HTMLFormElement>, brandId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await submitJson(`/api/admin/brands/${brandId}/products`, {
        productId: String(form.get("productId") ?? "")
      });
      setMessage("상품을 브랜드에 배정했습니다.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "상품을 배정하지 못했습니다.");
    }
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={createBrand} className="grid gap-4 rounded-md border bg-white p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">브랜드명</span>
          <input name="name" className="h-10 rounded-md border px-3" required placeholder="예: Glow Brand" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold">대표 이메일</span>
          <input name="contactEmail" className="h-10 rounded-md border px-3" type="email" placeholder="owner@example.com" />
        </label>
        <Button type="submit" disabled={state === "saving"}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          브랜드 생성
        </Button>
      </form>

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

      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">브랜드</th>
              <th className="px-4 py-3">멤버</th>
              <th className="px-4 py-3">배정 상품</th>
              <th className="px-4 py-3">멤버 연결</th>
              <th className="px-4 py-3">상품 배정</th>
            </tr>
          </thead>
          <tbody>
            {brands.length ? (
              brands.map((brand) => (
                <tr key={brand.id} className="border-b align-top last:border-b-0">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">{brand.slug}</p>
                    <p className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                      {getBrandStatusLabel(brand.status)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid gap-2">
                      {brand.memberships.length ? (
                        brand.memberships.map((membership) => (
                          <span key={membership.id} className="rounded-md border px-2 py-1">
                            <span className="font-semibold">{membership.email ?? membership.profileId}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{getMemberRoleLabel(membership.memberRole)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">연결된 멤버 없음</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid gap-2">
                      {brand.assignments.length ? (
                        brand.assignments.map((assignment) => (
                          <span key={assignment.id} className="rounded-md border px-2 py-1">
                            <span className="font-semibold">{assignment.product?.name ?? assignment.productId}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{getAssignmentStatusLabel(assignment.status)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">배정 상품 없음</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <form onSubmit={(event) => connectMember(event, brand.id)} className="grid gap-2">
                      <input name="email" type="email" className="h-10 rounded-md border px-3" placeholder="고객 계정 이메일" required />
                      <select name="memberRole" className="h-10 rounded-md border bg-white px-3">
                        <option value="editor">편집자</option>
                        <option value="owner">소유자</option>
                        <option value="viewer">조회자</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline" disabled={state === "saving"}>
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        연결
                      </Button>
                    </form>
                  </td>
                  <td className="px-4 py-4">
                    <form onSubmit={(event) => assignProduct(event, brand.id)} className="grid gap-2">
                      <select name="productId" className="h-10 rounded-md border bg-white px-3" required>
                        <option value="">상품 선택</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} / {product.brandName}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline" disabled={state === "saving"}>
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                        배정
                      </Button>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  등록된 브랜드가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getBrandStatusLabel(status: string) {
  if (status === "paused") {
    return "일시중지";
  }

  if (status === "archived") {
    return "보관됨";
  }

  return "활성";
}

function getMemberRoleLabel(role: string) {
  if (role === "owner") {
    return "소유자";
  }

  if (role === "viewer") {
    return "조회자";
  }

  return "편집자";
}

function getAssignmentStatusLabel(status: string) {
  if (status === "paused") {
    return "일시중지";
  }

  if (status === "archived") {
    return "보관됨";
  }

  return "활성";
}
