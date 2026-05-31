import { SiteHeaderNav } from "@/components/site-header-nav";
import { getCurrentAuthState } from "@/lib/auth";
import { isAdminProfile } from "@/lib/authz";
import { listBrandMembershipsForUser } from "@/lib/brand-store";

const baseNavItems = [
  { href: "/", label: "Home", activePath: "/" },
  { href: "/makeup", label: "Make up", activePath: "/makeup" },
  { href: "/shop", label: "Skincare", activePath: "/shop" },
  { href: "/about", label: "About", activePath: "/about" }
];

export async function SiteHeader() {
  const { user, profile } = await getCurrentAuthState();
  const isSignedIn = Boolean(user);
  const hasBrandPortalAccess = user ? await getHasBrandPortalAccess(user.id) : false;
  const navItems = [
    ...baseNavItems,
    ...(isSignedIn ? [{ href: "/account", label: "My Page" }] : []),
    ...(hasBrandPortalAccess ? [{ href: "/brand/products", label: "Brand Portal", activePath: "/brand" }] : []),
    ...(isAdminProfile(profile) ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  return (
    <header className="relative z-40 border-b border-[#dfdfdf] bg-white">
      <div className="flex w-full flex-col items-center px-5 sm:px-7">
        <SiteHeaderNav navItems={navItems} isSignedIn={isSignedIn} />
      </div>
    </header>
  );
}

async function getHasBrandPortalAccess(userId: string) {
  try {
    return (await listBrandMembershipsForUser(userId)).length > 0;
  } catch {
    return false;
  }
}
