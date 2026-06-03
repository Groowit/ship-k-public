"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Mail,
  MapPin,
  PackageCheck,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatUsd, type OrderStatus } from "@/lib/commerce";
import type {
  CommerceOrder,
  DefaultShippingAddressInput,
} from "@/lib/commerce-store";
import { getCustomerOrderStatusLabel } from "@/lib/fulfillment";
import { cn } from "@/lib/utils";

type AccountDashboardProfile = {
  email: string;
  fullName: string;
  phone: string;
  marketingOptIn: boolean;
  defaultShippingAddress: DefaultShippingAddressInput;
};

type EditMode = "profile" | "shipping" | null;

const activeStatuses = new Set<OrderStatus>([
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
]);

const accountFieldClass = "border-zinc-300";

export function AccountDashboard({
  profile,
  orders,
}: {
  profile: AccountDashboardProfile;
  orders: CommerceOrder[];
}) {
  const [savedProfile, setSavedProfile] = useState(profile);
  const [form, setForm] = useState(profile);
  const [activeEdit, setActiveEdit] = useState<EditMode>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recentOrders = orders.slice(0, 3);
  const activeOrderCount = orders.filter((order) =>
    activeStatuses.has(order.status),
  ).length;
  const trackingReadyCount = orders.filter((order) =>
    Boolean(order.shipmentCarrier && order.trackingNumber),
  ).length;
  const defaultShippingReady = Boolean(
    savedProfile.defaultShippingAddress.address1.trim(),
  );

  function openEdit(mode: Exclude<EditMode, null>) {
    setForm(savedProfile);
    setMessage(null);
    setError(null);
    setActiveEdit(mode);
  }

  function cancelEdit() {
    setForm(savedProfile);
    setMessage(null);
    setError(null);
    setActiveEdit(null);
  }

  function updateProfileField<
    Key extends "fullName" | "phone" | "marketingOptIn",
  >(key: Key, value: AccountDashboardProfile[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateShippingField<Key extends keyof DefaultShippingAddressInput>(
    key: Key,
    value: DefaultShippingAddressInput[Key],
  ) {
    setForm((current) => ({
      ...current,
      defaultShippingAddress: {
        ...current.defaultShippingAddress,
        [key]: value,
      },
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
          defaultShippingAddress: form.defaultShippingAddress,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save account details");
      }
      setSavedProfile(form);
      setActiveEdit(null);
      setMessage("Account details saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save account details",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section
        aria-labelledby="account-hub-title"
        className="rounded-md border border-zinc-200 bg-white p-5 sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-brand-heavy text-sm uppercase text-[#ff3d7f]">
              Account hub
            </p>
            <h1
              id="account-hub-title"
              className="mt-2 shipk-heading text-4xl sm:text-5xl"
            >
              My Page
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Review order activity, keep checkout defaults ready, and manage
              the account details that make future purchases easier.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/account/orders" className={buttonVariants()}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              View all orders
            </Link>
            <Link
              href="/shop"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-zinc-300 bg-white",
              )}
            >
              Shop again
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewTile
            icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />}
            label="Order activity"
            value={formatOrderCount(orders.length)}
            caption={getOrderActivityCaption({
              trackingReadyCount,
              activeOrderCount,
            })}
          />
          <OverviewTile
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            label="Default shipping"
            value={
              defaultShippingReady
                ? "Default shipping ready"
                : "Add default shipping"
            }
            caption={
              defaultShippingReady
                ? `${savedProfile.defaultShippingAddress.city}, ${savedProfile.defaultShippingAddress.state}`
                : "Used to prefill checkout"
            }
          />
          <OverviewTile
            icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
            label="Profile"
            value={savedProfile.fullName.trim() || "Add your name"}
            caption={savedProfile.email}
          />
          <OverviewTile
            icon={<Bell className="h-4 w-4" aria-hidden="true" />}
            label="Email updates"
            value={
              savedProfile.marketingOptIn
                ? "Email updates on"
                : "Email updates off"
            }
            caption="Product drops and order notes"
          />
        </div>
      </section>

      {message ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section
          aria-labelledby="recent-orders-title"
          className="rounded-md border border-zinc-200 bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f]">
                Purchase aftercare
              </p>
              <h2 id="recent-orders-title" className="mt-1 text-2xl font-black">
                Recent orders
              </h2>
            </div>
            {orders.length > 0 ? (
              <Link
                href="/account/orders"
                className="text-sm font-semibold underline-offset-4 hover:underline"
              >
                View all orders
              </Link>
            ) : null}
          </div>

          {recentOrders.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="group rounded-md border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <span className="flex flex-wrap items-start justify-between gap-3">
                    <span>
                      <span className="block font-black">
                        {order.orderNumber}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {order.productName}
                      </span>
                    </span>
                    <StatusBadge status={order.status} />
                  </span>
                  <span className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <span>
                      <span className="block text-xs uppercase">Total</span>
                      <span className="font-semibold text-foreground">
                        {formatUsd(order.totalCents)}
                      </span>
                    </span>
                    <span>
                      <span className="block text-xs uppercase">Tracking</span>
                      <span className="font-semibold text-foreground">
                        {order.trackingNumber
                          ? "Tracking ready"
                          : "Tracking pending"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground sm:justify-end">
                      View details
                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-zinc-300 bg-white p-5">
              <p className="font-semibold">No orders yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your order history and delivery updates will appear here after
                checkout.
              </p>
              <Link href="/shop" className={cn(buttonVariants(), "mt-4")}>
                Shop sets
              </Link>
            </div>
          )}
        </section>

        <aside className="grid h-fit gap-4">
          <section
            aria-labelledby="account-essentials-title"
            className="rounded-md border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f]">
                  Manage
                </p>
                <h2
                  id="account-essentials-title"
                  className="mt-1 text-xl font-black"
                >
                  Account essentials
                </h2>
              </div>
              <CheckCircle2
                className="h-5 w-5 text-emerald-600"
                aria-hidden="true"
              />
            </div>

            <div className="mt-5 grid gap-4">
              <SummaryRow
                icon={<Mail className="h-4 w-4" aria-hidden="true" />}
                label="Profile"
                value={savedProfile.fullName.trim() || savedProfile.email}
                caption={
                  savedProfile.phone ||
                  "Add a phone number for delivery contact"
                }
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-300 bg-white"
                    onClick={() => openEdit("profile")}
                    aria-expanded={activeEdit === "profile"}
                    aria-haspopup="dialog"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit profile
                  </Button>
                }
              />
              <SummaryRow
                icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                label="Default shipping"
                value={
                  defaultShippingReady
                    ? savedProfile.defaultShippingAddress.address1
                    : "No default shipping yet"
                }
                caption={
                  defaultShippingReady
                    ? `${savedProfile.defaultShippingAddress.city}, ${savedProfile.defaultShippingAddress.state} ${savedProfile.defaultShippingAddress.postalCode}`
                    : "Add one to speed up checkout"
                }
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-300 bg-white"
                    onClick={() => openEdit("shipping")}
                    aria-expanded={activeEdit === "shipping"}
                    aria-haspopup="dialog"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit shipping
                  </Button>
                }
              />
            </div>
          </section>

          <section
            aria-labelledby="account-help-title"
            className="rounded-md border border-zinc-200 bg-white p-5"
          >
            <div className="flex items-center gap-2">
              <HelpCircle
                className="h-5 w-5 text-[#ff3d7f]"
                aria-hidden="true"
              />
              <h2 id="account-help-title" className="text-lg font-black">
                Need help?
              </h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <Link
                href="/policies/shipping"
                className="font-semibold underline-offset-4 hover:underline"
              >
                Shipping policy
              </Link>
              <Link
                href="/policies/returns"
                className="font-semibold underline-offset-4 hover:underline"
              >
                Returns and refunds
              </Link>
              <Link
                href="/policies/privacy"
                className="font-semibold underline-offset-4 hover:underline"
              >
                Privacy policy
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <AccountEditModal
        mode={activeEdit}
        form={form}
        error={error}
        isSubmitting={isSubmitting}
        onClose={cancelEdit}
        onSubmit={saveAccount}
        onProfileChange={updateProfileField}
        onShippingChange={updateShippingField}
      />
    </div>
  );
}

function AccountEditModal({
  mode,
  form,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  onProfileChange,
  onShippingChange,
}: {
  mode: EditMode;
  form: AccountDashboardProfile;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onProfileChange: <Key extends "fullName" | "phone" | "marketingOptIn">(
    key: Key,
    value: AccountDashboardProfile[Key],
  ) => void;
  onShippingChange: <Key extends keyof DefaultShippingAddressInput>(
    key: Key,
    value: DefaultShippingAddressInput[Key],
  ) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, mode, onClose]);

  if (!mode) {
    return null;
  }

  const title = mode === "profile" ? "Edit profile" : "Edit shipping";
  const eyebrow = mode === "profile" ? "Contact details" : "Checkout default";
  const description =
    mode === "profile"
      ? "Keep your name, phone, and email update preference current."
      : "This address is used to prefill checkout and support delivery updates.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 py-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${mode}-edit-title`}
        aria-describedby={`${mode}-edit-description`}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-zinc-200 bg-white"
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f]">
                {eyebrow}
              </p>
              <h3 id={`${mode}-edit-title`} className="mt-1 text-xl font-black">
                {title}
              </h3>
              <p
                id={`${mode}-edit-description`}
                className="mt-1 text-sm text-muted-foreground"
              >
                {description}
              </p>
            </div>
            <Button
              ref={closeButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close account edit dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="grid gap-5 bg-white px-5 py-5 sm:px-6">
          {mode === "profile" ? (
            <div className="grid gap-4">
              <Field label="Full name" htmlFor="account-full-name">
                <Input
                  id="account-full-name"
                  className={accountFieldClass}
                  value={form.fullName}
                  onChange={(event) =>
                    onProfileChange("fullName", event.target.value)
                  }
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone" htmlFor="account-phone">
                <Input
                  id="account-phone"
                  className={accountFieldClass}
                  value={form.phone}
                  onChange={(event) =>
                    onProfileChange("phone", event.target.value)
                  }
                  autoComplete="tel"
                />
              </Field>
              <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#ff3d7f]"
                  checked={form.marketingOptIn}
                  onChange={(event) =>
                    onProfileChange("marketingOptIn", event.target.checked)
                  }
                />
                <span>
                  <span className="block font-semibold">Email updates</span>
                  <span className="mt-1 block text-muted-foreground">
                    Product drops, checkout reminders, and order notes.
                  </span>
                </span>
              </label>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Shipping name" htmlFor="default-shipping-name">
                <Input
                  id="default-shipping-name"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.name}
                  onChange={(event) =>
                    onShippingChange("name", event.target.value)
                  }
                  autoComplete="shipping name"
                />
              </Field>
              <Field label="Shipping phone" htmlFor="default-shipping-phone">
                <Input
                  id="default-shipping-phone"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.phone}
                  onChange={(event) =>
                    onShippingChange("phone", event.target.value)
                  }
                  autoComplete="shipping tel"
                />
              </Field>
              <Field label="Address line 1" htmlFor="default-shipping-address1">
                <Input
                  id="default-shipping-address1"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.address1}
                  onChange={(event) =>
                    onShippingChange("address1", event.target.value)
                  }
                  autoComplete="shipping address-line1"
                />
              </Field>
              <Field label="Address line 2" htmlFor="default-shipping-address2">
                <Input
                  id="default-shipping-address2"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.address2 ?? ""}
                  onChange={(event) =>
                    onShippingChange("address2", event.target.value)
                  }
                  autoComplete="shipping address-line2"
                />
              </Field>
              <Field label="City" htmlFor="default-shipping-city">
                <Input
                  id="default-shipping-city"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.city}
                  onChange={(event) =>
                    onShippingChange("city", event.target.value)
                  }
                  autoComplete="shipping address-level2"
                />
              </Field>
              <Field label="State" htmlFor="default-shipping-state">
                <Input
                  id="default-shipping-state"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.state}
                  onChange={(event) =>
                    onShippingChange("state", event.target.value)
                  }
                  autoComplete="shipping address-level1"
                />
              </Field>
              <Field label="ZIP code" htmlFor="default-shipping-postal-code">
                <Input
                  id="default-shipping-postal-code"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.postalCode}
                  onChange={(event) =>
                    onShippingChange("postalCode", event.target.value)
                  }
                  autoComplete="shipping postal-code"
                />
              </Field>
              <Field label="Country" htmlFor="default-shipping-country">
                <Input
                  id="default-shipping-country"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.country}
                  onChange={(event) =>
                    onShippingChange("country", event.target.value)
                  }
                  autoComplete="shipping country"
                />
              </Field>
              <Field
                label="Delivery memo"
                htmlFor="default-shipping-memo"
                className="sm:col-span-2"
              >
                <Textarea
                  id="default-shipping-memo"
                  className={accountFieldClass}
                  value={form.defaultShippingAddress.memo ?? ""}
                  onChange={(event) =>
                    onShippingChange("memo", event.target.value)
                  }
                />
              </Field>
            </div>
          )}

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-300 bg-white"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function OverviewTile({
  icon,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-foreground">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-lg font-black leading-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  caption,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  action: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-zinc-200 bg-zinc-50">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 break-words font-black">{value}</p>
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      <p className="pl-12 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="font-semibold">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      className={cn(
        "shrink-0 border bg-white font-semibold",
        getStatusBadgeClass(status),
      )}
    >
      {getCustomerOrderStatusLabel(status)}
    </Badge>
  );
}

function getStatusBadgeClass(status: OrderStatus) {
  if (status === "shipped" || status === "delivered") {
    return "border-emerald-200 text-emerald-700";
  }
  if (status === "pending_payment") {
    return "border-amber-200 text-amber-700";
  }
  if (status === "cancelled" || status === "refunded") {
    return "border-zinc-200 text-muted-foreground";
  }
  return "border-zinc-200 text-foreground";
}

function formatOrderCount(count: number) {
  return `${count} order${count === 1 ? "" : "s"}`;
}

function getOrderActivityCaption({
  trackingReadyCount,
  activeOrderCount,
}: {
  trackingReadyCount: number;
  activeOrderCount: number;
}) {
  if (trackingReadyCount > 0) {
    return `${trackingReadyCount} with tracking ready`;
  }
  if (activeOrderCount > 0) {
    return `${activeOrderCount} active order${activeOrderCount === 1 ? "" : "s"}`;
  }
  return "No active orders";
}
