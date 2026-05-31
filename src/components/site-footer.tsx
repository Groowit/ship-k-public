import Link from "next/link";

export function SiteFooter() {
  return (
    <footer id="about" className="bg-[#0a0a0a] text-white">
      <div className="container grid gap-8 py-12 text-sm md:grid-cols-[1.4fr_repeat(3,auto)]">
        <div>
          <p className="shipk-logo text-4xl leading-none">
            ship<span className="shipk-logo-k">K</span>
            <span className="ml-1 text-xl text-white" aria-hidden="true">
              *
            </span>
          </p>
          <p className="mt-3 max-w-md text-white/70">
            K-beauty made simple for the world. Beauty sets, tutorial-first
            product detail, and PayPal checkout for US shoppers.
          </p>
        </div>
        <nav className="grid gap-2 text-white/70">
          <p className="font-brand-heavy text-xs uppercase text-white">Shop</p>
          <Link href="/shop" className="hover:text-white">
            All sets
          </Link>
          <Link href="/shop" className="hover:text-white">
            Skincare
          </Link>
          <Link href="/makeup" className="hover:text-white">
            Makeup
          </Link>
        </nav>
        <nav className="grid gap-2 text-white/70">
          <p className="font-brand-heavy text-xs uppercase text-white">Help</p>
          <Link href="/policies/shipping" className="hover:text-white">
            Shipping
          </Link>
          <Link href="/policies/returns" className="hover:text-white">
            Returns
          </Link>
          <Link href="/account/orders" className="hover:text-white">
            Order updates
          </Link>
        </nav>
        <nav className="grid gap-2 text-white/70">
          <p className="font-brand-heavy text-xs uppercase text-white">Policies</p>
          <Link href="/policies/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/policies/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/policies/shipping" className="hover:text-white">
            Shipping
          </Link>
          <Link href="/policies/returns" className="hover:text-white">
            Returns
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        (c) 2026 shipK. K-beauty sets shipped from Korea.
      </div>
    </footer>
  );
}
