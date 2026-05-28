import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/brand/products"));
  }

  return (
    <section className="container py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            브랜드 포털
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal">상품 상세 관리</h1>
          <p className="mt-3 text-muted-foreground">
            로그인 계정: {profile?.email ?? user.email}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="rounded-md border bg-white px-3 py-2" href="/brand/products">
            상품
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/brand/reports">
            매출/정산 요약
          </Link>
        </nav>
      </div>
      {children}
    </section>
  );
}
