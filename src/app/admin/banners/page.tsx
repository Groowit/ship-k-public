import { AdminBannersClient } from "@/components/admin-banners-client";
import { requireAdminPageAccess } from "@/lib/admin-page-auth";
import { HomeBannerSetupRequiredError, listAdminHomeBanners } from "@/lib/home-banners";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  if (!(await requireAdminPageAccess("/admin/banners"))) {
    return null;
  }

  try {
    const banners = await listAdminHomeBanners();

    return (
      <div className="grid gap-5">
        <AdminBannersHeading />
        <AdminBannersClient initialBanners={banners} />
      </div>
    );
  } catch (error) {
    if (error instanceof HomeBannerSetupRequiredError) {
      return (
        <div className="grid gap-5">
          <AdminBannersHeading />
          <section className="rounded-md border bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              설정 필요
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-normal">배너 테이블이 아직 준비되지 않았습니다</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              새 홈 배너 기능을 사용하려면 Supabase 마이그레이션을 먼저 적용해야 합니다. 적용 후 이 화면에서
              배너 등록, 수정, 삭제, 순서 변경을 바로 사용할 수 있습니다.
            </p>
          </section>
        </div>
      );
    }

    throw error;
  }
}

function AdminBannersHeading() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-normal">홈 배너 관리</h2>
      <p className="text-sm text-muted-foreground">
        홈 상단 배너의 이미지, 문구, 링크, 폰트, 색상, 노출 순서를 관리합니다.
      </p>
    </div>
  );
}
