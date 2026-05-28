import { PolicyShell } from "@/components/policy-shell";

export default function ShippingPage() {
  return (
    <PolicyShell title="Shipping Policy" updatedAt="Last updated May 18, 2026">
      <p>
        shipK calculates US shipping in USD. Orders of $75 or more receive free
        shipping. Orders below $75 have a $9.99 shipping fee.
      </p>
      <p>
        Fulfillment is managed manually by the shipK team from Korea to US
        addresses. Tracking is added by an operator after shipment is prepared.
      </p>
      <p>
        Delivery estimates and carrier options may vary by logistics partner and
        destination. Customers receive tracking details when the shipment is ready.
      </p>
    </PolicyShell>
  );
}
