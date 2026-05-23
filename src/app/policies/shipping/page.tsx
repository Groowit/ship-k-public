import { PolicyShell } from "@/components/policy-shell";

export default function ShippingPage() {
  return (
    <PolicyShell title="Shipping Policy" updatedAt="MVP draft, May 18, 2026">
      <p>
        shipK calculates US shipping in USD. Orders of $75 or more receive free
        shipping. Orders below $75 have a $9.99 shipping fee.
      </p>
      <p>
        MVP fulfillment is managed manually from Korea to US addresses. Tracking is
        added by an operator after shipment is prepared.
      </p>
      <p>
        Delivery estimates and carrier options should be finalized with the logistics
        partner before public launch.
      </p>
    </PolicyShell>
  );
}
