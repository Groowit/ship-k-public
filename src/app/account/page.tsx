import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/account-dashboard";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { listOrdersByUser } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

const emptyDefaultShippingAddress = {
  name: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  memo: "",
};

export default async function AccountPage() {
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/account"));
  }

  const orders = await listOrdersByUser(user.id);

  return (
    <section className="account-page-shell bg-white">
      <div className="container py-7 sm:py-9">
        <AccountDashboard
          profile={{
            email: profile?.email ?? user.email ?? "",
            fullName: profile?.fullName ?? "",
            phone: profile?.phone ?? "",
            marketingOptIn: profile?.marketingOptIn ?? false,
            defaultShippingAddress:
              profile?.defaultShippingAddress ?? emptyDefaultShippingAddress,
          }}
          orders={orders}
        />
      </div>
    </section>
  );
}
