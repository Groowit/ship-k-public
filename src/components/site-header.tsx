import { SiteHeaderNav } from "@/components/site-header-nav";
import { getCurrentAuthState } from "@/lib/auth";
import { isAdminProfile } from "@/lib/authz";

const baseNavItems = [
  { href: "/makeup", label: "Make up", activePath: "/makeup" },
  { href: "/shop", label: "Skincare", activePath: "/shop" },
  { href: "/promoter", label: "For Sellers", activePath: "/promoter" },
  { href: "/about", label: "About", activePath: "/about" }
];

export async function SiteHeader() {
  const { user, profile } = await getCurrentAuthState();
  const isSignedIn = Boolean(user);
  const navItems = [
    ...baseNavItems,
    ...(isSignedIn ? [{ href: "/account", label: "My Page" }] : []),
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
