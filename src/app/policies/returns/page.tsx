import { PolicyShell } from "@/components/policy-shell";

export default function ReturnsPage() {
  return (
    <PolicyShell title="Return Policy" updatedAt="MVP draft, May 18, 2026">
      <p>
        Unopened items may be requested for return within 14 days after delivery.
        Opened change-of-mind returns are not accepted in the MVP policy.
      </p>
      <p>
        Damaged, defective, or incorrect items can be reviewed manually for refund,
        replacement, or reshipment.
      </p>
      <p>
        Automatic PayPal refund processing is outside the MVP. Operators adjust
        order and commission status manually after review.
      </p>
    </PolicyShell>
  );
}
