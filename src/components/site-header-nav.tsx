"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, LogOut, Search, Sparkles, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type HeaderNavItem = {
  href: string;
  label: string;
  activePath?: string;
};

const accountTriggerClass =
  "focus-ring inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2.5 text-foreground transition hover:bg-[#fff8f0] sm:h-11 sm:px-3";

const accountMenuClass =
  "absolute right-0 top-[calc(100%+0.85rem)] z-50 grid w-[15.5rem] gap-1 rounded-md border border-zinc-200 bg-white p-2 text-sm font-black text-foreground";

const accountMenuEyebrowClass =
  "px-3 py-2 text-[0.68rem] uppercase leading-none text-[#ff3d7f]";

const accountMenuItemClass =
  "flex w-full items-center justify-between gap-3 rounded px-3 py-2.5 text-left transition hover:bg-[#ffd6e3] focus-visible:bg-[#ffd6e3] focus-visible:outline-none";

const accountMenuIconClass =
  "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fff8f0] text-foreground ring-1 ring-black/10";

export function SiteHeaderNav({
  navItems,
  isSignedIn
}: {
  navItems: HeaderNavItem[];
  isSignedIn: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="grid min-h-[7.125rem] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/shop"
            className="focus-ring hidden h-11 w-11 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:grid"
            aria-label="Search products"
          >
            <Search className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>
        <Link
          href="/"
          className="shipk-logo justify-self-center text-[2.15rem] leading-none text-foreground sm:text-[3.25rem]"
          aria-label="shipK home"
        >
          ship<span className="shipk-logo-k">K</span>
          <span className="ml-2 align-top text-2xl text-[#ffe25a]" aria-hidden="true">
            ★
          </span>
        </Link>
        <div className="flex items-center justify-end gap-1 text-muted-foreground sm:gap-7">
          {isSignedIn ? (
            <SignedInAccountMenu />
          ) : (
            <SignedOutAccountMenu />
          )}
        </div>
      </div>
      <nav className="flex min-h-[4.25rem] w-full flex-wrap items-end justify-center gap-8 md:gap-12">
        {navItems.map((item) => {
          const activePath = item.activePath ?? item.href;
          const active =
            activePath === "/" ? pathname === "/" : pathname.startsWith(activePath);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "border-b-2 px-1 pb-5 text-base font-black text-foreground transition hover:text-primary md:text-lg",
                active ? "border-primary" : "border-transparent"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function useDismissibleMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return { isOpen, menuRef, setIsOpen };
}

function SignedInAccountMenu() {
  const { isOpen, menuRef, setIsOpen } = useDismissibleMenu();

  return (
    <div ref={menuRef} className="relative">
      <AccountMenuTrigger
        label="Account menu"
        isOpen={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      />
      {isOpen ? (
        <div role="menu" className={accountMenuClass}>
          <p className={accountMenuEyebrowClass}>Account</p>
          <Link
            role="menuitem"
            href="/account"
            className={accountMenuItemClass}
            onClick={() => setIsOpen(false)}
          >
            <span className="flex items-center gap-2">
              <span className={accountMenuIconClass}>
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              My Page
            </span>
            <ArrowRight className="h-4 w-4 text-[#ff3d7f]" aria-hidden="true" />
          </Link>
          <form method="post" action="/auth/sign-out">
            <button
              type="submit"
              role="menuitem"
              className={cn(accountMenuItemClass, "text-[#6f6f6f] hover:text-foreground")}
            >
              <span className="flex items-center gap-2">
                <span className={accountMenuIconClass}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </span>
                Logout
              </span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SignedOutAccountMenu() {
  const { isOpen, menuRef, setIsOpen } = useDismissibleMenu();

  return (
    <div ref={menuRef} className="relative">
      <AccountMenuTrigger
        label="Account access"
        isOpen={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      />
      {isOpen ? (
        <div role="menu" className={accountMenuClass}>
          <p className={accountMenuEyebrowClass}>Welcome</p>
          <Link
            role="menuitem"
            href="/auth"
            className={accountMenuItemClass}
            onClick={() => setIsOpen(false)}
          >
            <span className="flex items-center gap-2">
              <span className={accountMenuIconClass}>
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              Sign In
            </span>
            <ArrowRight className="h-4 w-4 text-[#ff3d7f]" aria-hidden="true" />
          </Link>
          <Link
            role="menuitem"
            href="/auth?mode=sign-up"
            className={accountMenuItemClass}
            onClick={() => setIsOpen(false)}
          >
            <span className="flex items-center gap-2">
              <span className={accountMenuIconClass}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              Register Now
            </span>
            <ArrowRight className="h-4 w-4 text-[#ff3d7f]" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenuTrigger({
  label,
  isOpen,
  onClick
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={accountTriggerClass}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={onClick}
    >
      <UserRound className="h-5 w-5" aria-hidden="true" />
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 transition-transform",
          isOpen ? "rotate-180" : "rotate-0"
        )}
        aria-hidden="true"
      />
    </button>
  );
}
