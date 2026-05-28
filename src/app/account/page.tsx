import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MapPin, Package, UserRound } from "lucide-react";
import { AccountProfileForm } from "@/components/account-profile-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { formatUsd } from "@/lib/commerce";
import { listOrdersByUser } from "@/lib/commerce-store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/account"));
  }

  const orders = await listOrdersByUser(user.id);
  const recentOrders = orders.slice(0, 3);
  const defaultShippingAddress = profile?.defaultShippingAddress ?? {
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US" as const,
    memo: ""
  };

  return (
    <section className="container py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
            My shipK
          </p>
          <h1 className="mt-2 shipk-heading text-5xl">My Page</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Account details, checkout defaults, and order updates stay together here.
          </p>
        </div>
        <Link
          href="/account/orders"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-full border-2 border-black font-black shadow-none"
          )}
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          All orders
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <AccountProfileForm
          profile={{
            email: profile?.email ?? user.email ?? "",
            fullName: profile?.fullName ?? "",
            phone: profile?.phone ?? "",
            marketingOptIn: profile?.marketingOptIn ?? false,
            defaultShippingAddress
          }}
        />

        <aside className="grid h-fit gap-4">
          <Card className="rounded-md border-2 border-black bg-[#fff8f0] shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading flex items-center gap-2 text-2xl">
                <UserRound className="h-5 w-5" aria-hidden="true" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>
                <span className="block text-muted-foreground">Email</span>
                {profile?.email ?? user.email ?? "Signed in"}
              </p>
              <p>
                <span className="block text-muted-foreground">Marketing</span>
                {profile?.marketingOptIn ? "Subscribed" : "Not subscribed"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border-2 border-black shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading flex items-center gap-2 text-2xl">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {defaultShippingAddress.address1 ? (
                <address className="not-italic text-muted-foreground">
                  <span className="block font-semibold text-foreground">
                    {defaultShippingAddress.name || profile?.fullName || "Default recipient"}
                  </span>
                  <span className="block">{defaultShippingAddress.address1}</span>
                  {defaultShippingAddress.address2 ? (
                    <span className="block">{defaultShippingAddress.address2}</span>
                  ) : null}
                  <span className="block">
                    {defaultShippingAddress.city}, {defaultShippingAddress.state}{" "}
                    {defaultShippingAddress.postalCode}
                  </span>
                </address>
              ) : (
                <p className="text-muted-foreground">No default shipping address yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-md border-2 border-black shadow-none">
            <CardHeader>
              <CardTitle className="shipk-heading text-2xl">Recent orders</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="grid gap-3 text-sm">
                  <p className="text-muted-foreground">No orders yet.</p>
                  <Link href="/shop" className="shipk-chip inline-flex bg-[#c8f26c]">
                    Shop sets
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="group rounded-md border-2 border-black p-3 text-sm transition hover:bg-[#ffd6e3]"
                    >
                      <span className="flex items-center justify-between gap-3 font-black">
                        {order.orderNumber}
                        <ArrowRight
                          className="h-4 w-4 transition group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="mt-1 block text-muted-foreground">
                        {order.status} · {formatUsd(order.totalCents)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
