import { PolicyShell } from "@/components/policy-shell";

export default function TermsPage() {
  return (
    <PolicyShell title="Terms of Use" updatedAt="MVP draft, May 18, 2026">
      <p>
        These terms are a product planning draft for the shipK MVP. By using the
        service, customers agree to provide accurate account, shipping, and payment
        information and to use the storefront only for lawful personal purchases.
      </p>
      <p>
        Product information is provided in English for US consumers. Product claims,
        ingredient details, and regulatory statements must be reviewed before a public
        launch.
      </p>
      <p>
        PayPal processes payment. shipK does not store full card numbers. Orders may
        be cancelled or refunded manually when fraud, stock, address, or fulfillment
        issues are found.
      </p>
    </PolicyShell>
  );
}
