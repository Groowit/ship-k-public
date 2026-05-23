import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderStatus } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export function OrderTrackingCard({
  status,
  carrier,
  trackingNumber,
  trackingUrl
}: {
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string;
}) {
  const hasTracking = Boolean(carrier && trackingNumber);

  return (
    <Card className="rounded-md border-2 border-black bg-[#fff8f0] shadow-none">
      <CardHeader>
        <CardTitle className="shipk-heading text-2xl">Tracking</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {hasTracking ? (
          <>
            <div className="grid gap-3 rounded-md border-2 border-black bg-white p-4">
              <p>
                <span className="block text-muted-foreground">Carrier</span>
                <span className="font-semibold">{carrier}</span>
              </p>
              <p>
                <span className="block text-muted-foreground">Tracking number</span>
                <span className="break-all font-semibold">{trackingNumber}</span>
              </p>
            </div>
            {trackingUrl ? (
              <a
                href={trackingUrl}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-full border-2 border-black font-black shadow-none"
                )}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Track package
              </a>
            ) : (
              <p className="rounded-md border-2 border-black bg-white p-3 text-muted-foreground">
                Use the carrier website to track this package.
              </p>
            )}
          </>
        ) : (
          <div className="rounded-md border-2 border-black bg-white p-4">
            <p className="font-brand-heavy text-sm uppercase">
              {status === "delivered" ? "Delivery complete" : "Not shipped yet"}
            </p>
            <p className="mt-2 text-muted-foreground">
              Tracking details will appear after your order ships.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
