import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { getCurrentAuthState } from "@/lib/auth";
import {
  listBrandMembershipsForUser,
  listBrandProductsForUser
} from "@/lib/brand-store";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BrandProductsPage() {
  const { user } = await getCurrentAuthState();

  if (!user) {
    return null;
  }

  const memberships = await listBrandMembershipsForUser(user.id);
  if (memberships.length === 0) {
    return <BrandForbidden />;
  }

  const rows = await listBrandProductsForUser(user.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">배정된 상품</h2>
          <p className="text-sm text-muted-foreground">
            브랜드가 수정할 수 있는 영역은 상세 본문, 이미지, 사용법, 루틴/상세 블록입니다.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">상품</th>
              <th className="px-4 py-3">상품 상태</th>
              <th className="px-4 py-3">수정일</th>
              <th className="px-4 py-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map(({ product, assignment }) => (
                <tr key={assignment.id} className="border-b last:border-b-0">
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
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{getStatusLabel(product.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/brand/products/${product.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        상세 수정
                      </Link>
                      {product.status === "active" ? (
                        <Link href={`/products/${product.slug}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                          공개 페이지
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  아직 브랜드에 배정된 상품이 없습니다. 운영자에게 상품 배정을 요청해주세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrandForbidden() {
  return (
    <section className="rounded-md border bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">403</p>
      <h2 className="mt-2 text-2xl font-bold tracking-normal">브랜드 멤버 권한이 필요합니다</h2>
      <p className="mt-3 text-muted-foreground">
        이 계정은 아직 브랜드에 연결되어 있지 않습니다. 운영자가 브랜드 멤버로 연결한 뒤 상품을 확인할 수 있습니다.
      </p>
    </section>
  );
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
