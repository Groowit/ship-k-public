import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderStatus } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export function OrderTrackingCard({
  status,
  carrier,
  trackingNumber,
  trackingUrl,
  showAction = true,
}: {
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string;
  showAction?: boolean;
}) {
  const hasTracking = Boolean(carrier && trackingNumber);

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-black">Tracking details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {hasTracking ? (
          <>
            <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4">
              <p>
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  Carrier
                </span>
                <span className="mt-1 block font-semibold">{carrier}</span>
              </p>
              <p>
                <span className="block text-xs font-semibold uppercase text-muted-foreground">
                  Tracking number
                </span>
                <span className="mt-1 block break-all font-semibold">
                  {trackingNumber}
                </span>
              </p>
            </div>
            {trackingUrl && showAction ? (
              <a
                href={trackingUrl}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-black/15",
                )}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Track package
              </a>
            ) : null}
            {!trackingUrl ? (
              <p className="rounded-md border border-zinc-200 bg-white p-3 text-muted-foreground">
                Use the carrier website to track this package.
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="font-brand-heavy text-sm uppercase">
              {getTrackingFallbackLabel(status)}
            </p>
            <p className="mt-2 text-muted-foreground">
              {getTrackingFallbackCopy(status)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTrackingFallbackLabel(status: OrderStatus) {
  if (status === "delivered") {
    return "Delivery complete";
  }
  if (status === "cancelled" || status === "refunded") {
    return "Order closed";
  }
  return "Tracking not available yet";
}

function getTrackingFallbackCopy(status: OrderStatus) {
  if (status === "delivered") {
    return "This order is delivered; tracking details are no longer active here.";
  }
  if (status === "cancelled" || status === "refunded") {
    return "This order will not receive new tracking details.";
  }
  return "Tracking will appear after your order ships.";
}
