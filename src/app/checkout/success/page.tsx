import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const orderNumber =
    typeof params.order === "string" ? params.order : "Your order";

  return (
    <section className="container grid min-h-[65vh] place-items-center py-12">
      <div className="shipk-surface max-w-xl rounded-md p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-5 shipk-heading text-4xl">Payment complete</h1>
        <p className="mt-3 text-muted-foreground">
          {orderNumber} is confirmed. Shipping status will appear in your order
          history after fulfillment begins.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/account/orders" className={cn(buttonVariants(), "shipk-btn-pop")}>
            View orders
          </Link>
          <Link
            href="/shop"
            className={cn(buttonVariants({ variant: "outline" }), "shipk-btn-outline-pop")}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
