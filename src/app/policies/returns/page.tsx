import { PolicyShell } from "@/components/policy-shell";

export default function ReturnsPage() {
  return (
    <PolicyShell title="Return Policy" updatedAt="Last updated May 18, 2026">
      <p>
        Unopened items may be requested for return within 14 days after delivery.
        Opened change-of-mind returns are not accepted under this return policy.
      </p>
      <p>
        Damaged, defective, or incorrect items can be reviewed manually for refund,
        replacement, or reshipment.
      </p>
      <p>
        Refunds are reviewed and processed manually by the shipK team. Operators
        update order and commission status after review.
      </p>
    </PolicyShell>
  );
}
