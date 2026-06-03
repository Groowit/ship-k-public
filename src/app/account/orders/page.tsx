import { redirect } from "next/navigation";
import { AccountOrdersClient } from "@/components/account-orders-client";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { listOrdersByUser } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const { user } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath("/account/orders"));
  }

  const orders = await listOrdersByUser(user.id);

  return <AccountOrdersClient orders={orders} />;
}
