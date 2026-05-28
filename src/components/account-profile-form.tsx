"use client";

import { cloneElement, useState, type FormEvent, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DefaultShippingAddressInput } from "@/lib/commerce-store";

type AccountProfileFormState = {
  email: string;
  fullName: string;
  phone: string;
  marketingOptIn: boolean;
  defaultShippingAddress: DefaultShippingAddressInput;
};

export function AccountProfileForm({ profile }: { profile: AccountProfileFormState }) {
  const [form, setForm] = useState<AccountProfileFormState>(profile);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateProfileField<Key extends "fullName" | "phone" | "marketingOptIn">(
    key: Key,
    value: AccountProfileFormState[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateShippingField<Key extends keyof DefaultShippingAddressInput>(
    key: Key,
    value: DefaultShippingAddressInput[Key]
  ) {
    setForm((current) => ({
      ...current,
      defaultShippingAddress: {
        ...current.defaultShippingAddress,
        [key]: value
      }
    }));
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          marketingOptIn: form.marketingOptIn,
          defaultShippingAddress: form.defaultShippingAddress
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save account details");
      }
      setMessage("Account details saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save account details"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={saveAccount}>
      <Card className="rounded-md border-2 border-black shadow-none">
        <CardHeader>
          <CardTitle className="shipk-heading text-2xl">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input id="account-email" value={form.email} disabled aria-label="Email" />
            </Field>
            <Field label="Full name">
              <Input
                id="account-full-name"
                value={form.fullName}
                onChange={(event) => updateProfileField("fullName", event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Phone">
              <Input
                id="account-phone"
                value={form.phone}
                onChange={(event) => updateProfileField("phone", event.target.value)}
                autoComplete="tel"
              />
            </Field>
            <label className="flex items-start gap-3 rounded-md border-2 border-black bg-[#fff8f0] px-3 py-3 text-sm sm:mt-7">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={form.marketingOptIn}
                onChange={(event) =>
                  updateProfileField("marketingOptIn", event.target.checked)
                }
              />
              <span>
                <span className="block font-black">Email updates</span>
                <span className="mt-1 block text-xs font-semibold leading-snug text-muted-foreground">
                  Get product drops, creator offers, and shipK news.
                </span>
              </span>
            </label>
          </div>

          <div className="border-t-2 border-black pt-5">
            <h3 className="shipk-heading text-xl">Default shipping</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Shipping name">
                <Input
                  id="default-shipping-name"
                  value={form.defaultShippingAddress.name}
                  onChange={(event) => updateShippingField("name", event.target.value)}
                  autoComplete="shipping name"
                />
              </Field>
              <Field label="Shipping phone">
                <Input
                  id="default-shipping-phone"
                  value={form.defaultShippingAddress.phone}
                  onChange={(event) => updateShippingField("phone", event.target.value)}
                  autoComplete="shipping tel"
                />
              </Field>
              <Field label="Address line 1">
                <Input
                  id="default-shipping-address1"
                  value={form.defaultShippingAddress.address1}
                  onChange={(event) => updateShippingField("address1", event.target.value)}
                  autoComplete="shipping address-line1"
                />
              </Field>
              <Field label="Address line 2">
                <Input
                  id="default-shipping-address2"
                  value={form.defaultShippingAddress.address2 ?? ""}
                  onChange={(event) => updateShippingField("address2", event.target.value)}
                  autoComplete="shipping address-line2"
                />
              </Field>
              <Field label="City">
                <Input
                  id="default-shipping-city"
                  value={form.defaultShippingAddress.city}
                  onChange={(event) => updateShippingField("city", event.target.value)}
                  autoComplete="shipping address-level2"
                />
              </Field>
              <Field label="State">
                <Input
                  id="default-shipping-state"
                  value={form.defaultShippingAddress.state}
                  onChange={(event) => updateShippingField("state", event.target.value)}
                  autoComplete="shipping address-level1"
                />
              </Field>
              <Field label="ZIP code">
                <Input
                  id="default-shipping-postal-code"
                  value={form.defaultShippingAddress.postalCode}
                  onChange={(event) =>
                    updateShippingField("postalCode", event.target.value)
                  }
                  autoComplete="shipping postal-code"
                />
              </Field>
              <Field label="Delivery memo" className="sm:col-span-2">
                <Textarea
                  id="default-shipping-memo"
                  value={form.defaultShippingAddress.memo ?? ""}
                  onChange={(event) => updateShippingField("memo", event.target.value)}
                />
              </Field>
            </div>
          </div>

          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <Button
            type="submit"
            className="w-full rounded-full border-2 border-black bg-[#ff3d7f] font-black text-white shadow-none hover:brightness-95 sm:w-fit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save account details"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: ReactElement<{ id?: string; "aria-label"?: string }>;
}) {
  const controlId = children.props.id ?? label.toLowerCase().replace(/\s+/g, "-");
  const control =
    children.props.id || children.props["aria-label"]
      ? children
      : cloneElement(children, { id: controlId });

  return (
    <div className={className}>
      <Label htmlFor={controlId} className="font-black">
        {label}
      </Label>
      <div className="mt-2">{control}</div>
    </div>
  );
}
