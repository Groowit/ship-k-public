"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUsd } from "@/lib/commerce";
import { getImageOptimizationProps } from "@/lib/image-path";
import { Product, getProductCheckoutSummary } from "@/lib/products";

type CheckoutFormState = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  memo: string;
  marketingOptIn: boolean;
  agreed: boolean;
};

const initialForm: CheckoutFormState = {
  name: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  memo: "",
  marketingOptIn: false,
  agreed: false
};

export function CheckoutForm({
  product,
  quantity,
  initialCustomer
}: {
  product: Product;
  quantity: number;
  initialCustomer?: {
    name?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    memo?: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState<CheckoutFormState>(() => ({
    ...initialForm,
    name: initialCustomer?.name ?? "",
    email: initialCustomer?.email ?? "",
    phone: initialCustomer?.phone ?? "",
    address1: initialCustomer?.address1 ?? "",
    address2: initialCustomer?.address2 ?? "",
    city: initialCustomer?.city ?? "",
    state: initialCustomer?.state ?? "",
    postalCode: initialCustomer?.postalCode ?? "",
    memo: initialCustomer?.memo ?? ""
  }));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totals = useMemo(
    () => getProductCheckoutSummary(product, quantity),
    [product, quantity]
  );
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const useMockPayPal =
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_PAYPAL_MOCK === "true" || !paypalClientId);
  const isPayPalUnavailable = !useMockPayPal && !paypalClientId;

  async function createOrder() {
    ensureReady();
    const response = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productSlug: product.slug,
        quantity,
        shippingAddress: getShippingAddress()
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not create PayPal order");
    }
    return payload.id as string;
  }

  async function captureOrder(orderID: string) {
    const response = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderID,
        productSlug: product.slug,
        quantity,
        shippingAddress: getShippingAddress()
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not capture PayPal order");
    }
    router.push(`/checkout/success?order=${encodeURIComponent(payload.orderNumber)}`);
  }

  async function handleMockPayPal() {
    setError(null);
    setIsSubmitting(true);
    try {
      const orderID = await createOrder();
      await captureOrder(orderID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function ensureReady() {
    const required = [
      form.name,
      form.email,
      form.phone,
      form.address1,
      form.city,
      form.state,
      form.postalCode
    ];
    if (required.some((value) => !value.trim())) {
      throw new Error("Please complete all required shipping fields");
    }
    if (!form.agreed) {
      throw new Error("Please accept the terms and privacy policy");
    }
  }

  function getShippingAddress() {
    return {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: "US",
      memo: form.memo
    };
  }

  function updateField<Key extends keyof CheckoutFormState>(
    key: Key,
    value: CheckoutFormState[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
      <Card className="rounded-md border-2 border-black">
        <CardHeader>
          <CardTitle className="shipk-heading text-2xl">Shipping information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input
                aria-label="Name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Email" required>
              <Input
                aria-label="Email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                type="email"
                autoComplete="email"
              />
            </Field>
            <Field label="Phone" required>
              <Input
                aria-label="Phone"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                autoComplete="tel"
              />
            </Field>
            <Field label="Address line 1" required>
              <Input
                aria-label="Address line 1"
                value={form.address1}
                onChange={(event) => updateField("address1", event.target.value)}
                autoComplete="address-line1"
              />
            </Field>
            <Field label="Address line 2">
              <Input
                aria-label="Address line 2"
                value={form.address2}
                onChange={(event) => updateField("address2", event.target.value)}
                autoComplete="address-line2"
              />
            </Field>
            <Field label="City" required>
              <Input
                aria-label="City"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                autoComplete="address-level2"
              />
            </Field>
            <Field label="State" required>
              <Input
                aria-label="State"
                value={form.state}
                onChange={(event) => updateField("state", event.target.value)}
                autoComplete="address-level1"
              />
            </Field>
            <Field label="ZIP code" required>
              <Input
                aria-label="ZIP code"
                value={form.postalCode}
                onChange={(event) => updateField("postalCode", event.target.value)}
                autoComplete="postal-code"
              />
            </Field>
            <Field label="Delivery memo" className="sm:col-span-2">
              <Textarea
                aria-label="Delivery memo"
                value={form.memo}
                onChange={(event) => updateField("memo", event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={form.marketingOptIn}
                onChange={(event) =>
                  updateField("marketingOptIn", event.target.checked)
                }
              />
              <span>Send me product drops and creator offers by email.</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={form.agreed}
                onChange={(event) => updateField("agreed", event.target.checked)}
              />
                <span>
                I agree to the Terms, Privacy Policy, Shipping Policy, and Return
                Policy.
              </span>
            </label>
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit rounded-md border-2 border-black">
        <CardHeader>
          <CardTitle className="shipk-heading text-2xl">Order summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[72px_1fr] gap-4">
            <Image
              src={product.heroImagePath}
              alt=""
              width={72}
              height={72}
              {...getImageOptimizationProps(product.heroImagePath)}
              className="aspect-square rounded-md border-2 border-black object-contain p-1"
            />
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.option.name} x {quantity}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-2 border-t-2 border-black pt-4 text-sm">
            <Row label="Subtotal" value={formatUsd(totals.subtotalCents)} />
            <Row
              label="Shipping"
              value={
                totals.shippingCents === 0 ? "Free" : formatUsd(totals.shippingCents)
              }
            />
            <Row label="Tax" value="Calculated as $0.00 at checkout" />
            <div className="mt-2 flex justify-between border-t-2 border-black pt-4 text-base font-black">
              <dt>Total</dt>
              <dd>{formatUsd(totals.totalCents)}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-md border-2 border-black bg-[#fff8f0] p-3 text-xs leading-5 text-muted-foreground">
            Customs duties and taxes may apply and are the customer&apos;s
            responsibility. Review the{" "}
            <Link href="/policies/terms" className="font-black underline">
              Terms
            </Link>
            ,{" "}
            <Link href="/policies/privacy" className="font-black underline">
              Privacy
            </Link>
            ,{" "}
            <Link href="/policies/shipping" className="font-black underline">
              Shipping
            </Link>
            , and{" "}
            <Link href="/policies/returns" className="font-black underline">
              Return
            </Link>{" "}
            policies before payment.
          </div>
          {error ? (
            <p role="alert" className="mt-4 rounded-md border-2 border-red-700 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="mt-5">
            {isPayPalUnavailable ? (
              <p role="alert" className="rounded-md border-2 border-red-700 bg-red-50 p-3 text-sm text-red-700">
                PayPal checkout is not configured.
              </p>
            ) : useMockPayPal ? (
              <Button
                type="button"
                className="shipk-btn-pop w-full"
                onClick={handleMockPayPal}
                disabled={isSubmitting}
                data-testid="mock-paypal-button"
              >
                {isSubmitting ? "Processing..." : "Pay with PayPal Sandbox"}
              </Button>
            ) : (
              <PayPalScriptProvider
                options={{
                  clientId: paypalClientId ?? "",
                  currency: "USD",
                  intent: "capture"
                }}
              >
                <PayPalButtons
                  style={{ layout: "vertical", shape: "rect" }}
                  createOrder={async () => createOrder()}
                  onApprove={async (data) => {
                    await captureOrder(data.orderID);
                  }}
                  onError={(err) => {
                    setError(err instanceof Error ? err.message : "Payment failed");
                  }}
                />
              </PayPalScriptProvider>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="font-black">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
