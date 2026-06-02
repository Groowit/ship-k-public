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
  isAuthenticated
}: {
  product: Product;
  isAuthenticated: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const maxCheckoutQuantity = getMaxCheckoutQuantity(product);
  const canCheckout = isProductPurchasable(product);
  const displayedQuantity = canCheckout ? quantity : 1;
  const totals = useMemo(
    () => getProductCheckoutSummary(product, displayedQuantity),
    [product, displayedQuantity]
  );
  const checkoutPath = `/checkout?product=${product.slug}&qty=${displayedQuantity}`;
  const checkoutHref = isAuthenticated
    ? checkoutPath
    : buildAuthRedirectPath(checkoutPath);

  useEffect(() => {
    if (!canCheckout) {
      setQuantity(1);
      return;
    }

    setQuantity((value) => Math.min(Math.max(1, value), maxCheckoutQuantity));
  }, [canCheckout, maxCheckoutQuantity]);

  return (
    <div className="rounded-md border-2 border-black bg-white p-5">
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
        <div className="grid grid-cols-[40px_48px_40px] overflow-hidden rounded-md border-2 border-black bg-background">
          <button
            type="button"
            className="focus-ring flex h-10 items-center justify-center"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={!canCheckout || quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <output className="flex h-10 items-center justify-center border-x-2 border-black text-sm font-black">
            {displayedQuantity}
          </output>
          <button
            type="button"
            className="focus-ring flex h-10 items-center justify-center"
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
      <dl className="mt-5 grid gap-2 border-t-2 border-black pt-4 text-sm">
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
          className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop mt-5 w-full")}
        >
          Buy now
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(buttonVariants({ size: "lg" }), "shipk-btn-pop mt-5 w-full")}
        >
          Out of stock
        </button>
      )}
    </div>
  );
}
