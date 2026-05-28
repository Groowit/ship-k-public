import { PolicyShell } from "@/components/policy-shell";

export default function TermsPage() {
  return (
    <PolicyShell title="Terms of Use" updatedAt="Last updated May 18, 2026">
      <p>
        By using shipK, customers agree to provide accurate account, shipping, and
        payment information and to use the storefront only for lawful personal
        purchases.
      </p>
      <p>
        Product information is provided in English for US consumers. Product claims,
        ingredient details, and regulatory statements are reviewed before items are
        offered for sale, and customers should follow each product label.
      </p>
      <p>
        PayPal processes payment. shipK does not store full card numbers. Orders may
        be cancelled or refunded manually when fraud, stock, address, or fulfillment
        issues are found.
      </p>
    </PolicyShell>
  );
}
