"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Product,
  getMaxCheckoutQuantity,
  getProductCheckoutSummary,
  isProductPurchasable
} from "@/lib/products";
import { formatUsd } from "@/lib/commerce";
import { cn } from "@/lib/utils";
import { buildAuthRedirectPath } from "@/lib/authz";

export function BuyBox({
  product,
  isAuthenticated,
  quantity: controlledQuantity,
  onQuantityChange
}: {
  product: Product;
  isAuthenticated: boolean;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
}) {
  const [internalQuantity, setInternalQuantity] = useState(1);
  const maxCheckoutQuantity = getMaxCheckoutQuantity(product);
  const canCheckout = isProductPurchasable(product);
  const quantity = controlledQuantity ?? internalQuantity;
  const displayedQuantity = canCheckout ? quantity : 1;
  const totals = useMemo(
    () => getProductCheckoutSummary(product, displayedQuantity),
    [product, displayedQuantity]
  );
  const checkoutPath = `/checkout?product=${product.slug}&qty=${displayedQuantity}`;
  const checkoutHref = isAuthenticated
    ? checkoutPath
    : buildAuthRedirectPath(checkoutPath);
  const actionLabel = isAuthenticated ? "Buy now" : "Sign in to buy";

  const setQuantity = (nextValue: number | ((value: number) => number)) => {
    const nextQuantity = clampCheckoutQuantity(
      typeof nextValue === "function" ? nextValue(quantity) : nextValue,
      canCheckout,
      maxCheckoutQuantity
    );

    if (controlledQuantity === undefined) {
      setInternalQuantity(nextQuantity);
    }

    onQuantityChange?.(nextQuantity);
  };

  useEffect(() => {
    const nextQuantity = clampCheckoutQuantity(quantity, canCheckout, maxCheckoutQuantity);

    if (nextQuantity === quantity) {
      return;
    }

    if (controlledQuantity === undefined) {
      setInternalQuantity(nextQuantity);
    }

    onQuantityChange?.(nextQuantity);
  }, [canCheckout, controlledQuantity, maxCheckoutQuantity, onQuantityChange, quantity]);

  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-brand-heavy text-xs uppercase text-[#ff3d7f]">Option</p>
          <p className="mt-1 font-black">{product.option.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">SKU {product.option.sku}</p>
        </div>
        <p className="font-brand-heavy text-xl">{formatUsd(product.option.priceCents)}</p>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-sm font-black">Quantity</span>
        <div className="grid grid-cols-[44px_52px_44px] overflow-hidden rounded-full border border-zinc-300 bg-background">
          <button
            type="button"
            className="focus-ring flex h-11 items-center justify-center"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={!canCheckout || quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <output className="flex h-11 items-center justify-center border-x border-zinc-300 text-sm font-black">
            {displayedQuantity}
          </output>
          <button
            type="button"
            className="focus-ring flex h-11 items-center justify-center"
            onClick={() =>
              setQuantity((value) => Math.min(maxCheckoutQuantity, value + 1))
            }
            disabled={!canCheckout || quantity >= maxCheckoutQuantity}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <dl className="mt-5 grid gap-2 border-t border-zinc-200 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-semibold">{formatUsd(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="font-semibold">
            {totals.shippingCents === 0 ? "Free" : formatUsd(totals.shippingCents)}
          </dd>
        </div>
      </dl>
      {canCheckout ? (
        <Link
          href={checkoutHref}
          className={cn(buttonVariants({ size: "lg" }), "shipk-commerce-primary mt-5 w-full")}
        >
          {actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(buttonVariants({ size: "lg" }), "shipk-commerce-primary mt-5 w-full")}
        >
          Out of stock
        </button>
      )}
    </div>
  );
}

function clampCheckoutQuantity(value: number, canCheckout: boolean, maxCheckoutQuantity: number) {
  if (!canCheckout) {
    return 1;
  }

  return Math.min(Math.max(1, value), maxCheckoutQuantity);
}
