import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentAuthState } from "@/lib/auth";
import { buildAuthRedirectPath } from "@/lib/authz";
import { findProductBySlug } from "@/lib/commerce-store";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = typeof params.product === "string" ? params.product : "";
  const product = await findProductBySlug(slug);

  if (!product) {
    redirect("/shop");
  }

  const quantity = Math.max(
    1,
    Math.min(9, Number.parseInt(String(params.qty ?? "1"), 10) || 1)
  );
  const { user, profile } = await getCurrentAuthState();

  if (!user) {
    redirect(buildAuthRedirectPath(`/checkout?product=${slug}&qty=${quantity}`));
  }

  const defaultShippingAddress = profile?.defaultShippingAddress;

  return (
    <section className="container py-10">
      <div className="mb-8 max-w-2xl">
        <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
          Secure checkout
        </p>
        <h1 className="mt-2 shipk-heading text-5xl">Pay with PayPal</h1>
        <p className="mt-3 text-muted-foreground">
          Confirm your US shipping details, review the final total, then continue
          with PayPal.
        </p>
      </div>
      <CheckoutForm
        product={product}
        quantity={quantity}
        initialCustomer={{
          name: defaultShippingAddress?.name || profile?.fullName || "",
          email: profile?.email ?? user.email ?? "",
          phone: defaultShippingAddress?.phone || profile?.phone || "",
          address1: defaultShippingAddress?.address1 ?? "",
          address2: defaultShippingAddress?.address2 ?? "",
          city: defaultShippingAddress?.city ?? "",
          state: defaultShippingAddress?.state ?? "",
          postalCode: defaultShippingAddress?.postalCode ?? "",
          memo: defaultShippingAddress?.memo ?? ""
        }}
      />
    </section>
  );
}
