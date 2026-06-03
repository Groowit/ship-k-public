import type { OrderStatus } from "@/lib/commerce";
import { cn } from "@/lib/utils";

const steps: Array<{
  label: string;
  status: OrderStatus;
  description: string;
}> = [
  { label: "Paid", status: "paid", description: "Payment received" },
  { label: "Preparing", status: "preparing", description: "Packing order" },
  { label: "Shipped", status: "shipped", description: "With carrier" },
  { label: "Delivered", status: "delivered", description: "Delivery complete" },
];

const stepIndexByStatus: Partial<Record<OrderStatus, number>> = {
  paid: 0,
  preparing: 1,
  shipped: 2,
  delivered: 3,
};

export function OrderShippingProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div
        role="status"
        className="rounded-md border border-zinc-200 bg-white p-4 text-sm"
      >
        <p className="font-brand-heavy text-sm uppercase">Order closed</p>
        <p className="mt-2 font-semibold">
          This order is {status === "cancelled" ? "cancelled" : "refunded"}.
        </p>
      </div>
    );
  }

  const activeIndex = stepIndexByStatus[status] ?? -1;
  const currentStep = steps[activeIndex];
  const message = getProgressMessage(status);

  return (
    <div className="grid gap-4">
      {message ? (
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <p className="font-brand-heavy text-sm uppercase">
            {currentStep?.label ?? "Order received"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      ) : null}
      <ol className="grid gap-3 sm:grid-cols-4" aria-label="Delivery progress">
        {steps.map((step, index) => {
          const active = index <= activeIndex;
          const current = index === activeIndex;

          return (
            <li
              key={step.status}
              className={cn(
                "min-h-20 rounded-md border p-3 text-sm",
                active
                  ? "border-emerald-200 bg-white text-foreground"
                  : "border-zinc-200 bg-white text-muted-foreground",
                current ? "ring-2 ring-[#ff3d7f]/70 ring-offset-2" : "",
              )}
            >
              <span
                data-active={active}
                data-current={current}
                className="block font-brand-heavy text-xs uppercase"
              >
                {step.label}
              </span>
              <span className="mt-2 block text-xs font-semibold">
                {active && !current ? "Complete" : step.description}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function getProgressMessage(status: OrderStatus) {
  const messages: Partial<Record<OrderStatus, string>> = {
    pending_payment: "We are waiting for payment confirmation.",
    paid: "Your order is confirmed. We will start preparing it soon.",
    preparing: "Your order is being packed for shipment.",
    shipped: "Your package is on the way.",
    delivered: "Your package has been delivered.",
  };

  return messages[status];
}
