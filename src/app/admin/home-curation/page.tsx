import { AdminHomeCurationClient } from "@/components/admin-home-curation-client";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { listProducts } from "@/lib/commerce-store";
import {
  HomeCurationSetupRequiredError,
  listAdminHomeCurationEntries
} from "@/lib/home-curation";

export const dynamic = "force-dynamic";

export default async function AdminHomeCurationPage() {
  if (!(await requireAdminPageAccess("/admin/home-curation"))) {
    return null;
  }

  try {
    const [entries, products] = await Promise.all([
      listAdminHomeCurationEntries(),
      listProducts()
    ]);

    return (
      <div className="grid gap-5">
        <AdminHomeCurationHeading />
        <AdminHomeCurationClient initialEntries={entries} products={products} />
      </div>
    );
  } catch (error) {
    if (error instanceof HomeCurationSetupRequiredError) {
      return (
        <div className="grid gap-5">
          <AdminHomeCurationHeading />
          <section className="rounded-md border bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              설정 필요
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-normal">
              홈 큐레이션 테이블이 아직 준비되지 않았습니다
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              홈 큐레이션 상품 선반을 사용하려면 Supabase 마이그레이션을 먼저 적용해야 합니다.
              적용 후 이 화면에서 상품 등록, 삭제, 순서 변경을 바로 사용할 수 있습니다.
            </p>
          </section>
        </div>
      );
    }

    throw error;
  }
}

function AdminHomeCurationHeading() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-normal">홈 큐레이션 상품 선반</h2>
      <p className="text-sm text-muted-foreground">
        홈의 Curated for you 레일에 노출할 상품과 순서를 운영자가 직접 관리합니다.
      </p>
    </div>
  );
}
