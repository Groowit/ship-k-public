import { PolicyShell } from "@/components/policy-shell";

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy Policy" updatedAt="MVP draft, May 18, 2026">
      <p>
        shipK collects account details, shipping contact information, order records,
        referral attribution, and payment status data needed to operate the MVP.
      </p>
      <p>
        Referral links may set a 48-hour last-click attribution cookie. The cookie is
        used to connect eligible purchases to a creator commission.
      </p>
      <p>
        Marketing email is optional. Customers can complete checkout without opting
        in to promotional messages.
      </p>
    </PolicyShell>
  );
}
