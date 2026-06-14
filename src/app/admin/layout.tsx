import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath, isAdminProfile } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/admin"));
  }

  if (!isAdminProfile(profile)) {
    return (
      <section className="container py-10">
        <div className="rounded-md border bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            403
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">운영자 권한이 필요합니다</h1>
          <p className="mt-3 text-muted-foreground">
            로그인은 되어 있지만 이 계정에는 shipK 운영자 권한이 없습니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            운영자
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-normal">shipK 운영 관리</h1>
          <p className="mt-3 text-muted-foreground">
            로그인 계정: {profile?.email ?? user.email}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin">
            대시보드
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/products">
            상품
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/banners">
            배너
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/home-curation">
            홈 큐레이션
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/brands">
            브랜드
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/orders">
            주문
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/reviews">
            리뷰
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/affiliates">
            홍보자
          </Link>
          <Link className="rounded-md border bg-white px-3 py-2" href="/admin/commissions">
            커미션
          </Link>
        </nav>
      </div>
      {children}
    </section>
  );
}
