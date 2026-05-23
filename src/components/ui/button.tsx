"use client";

import * as React from "react";
import {
  buttonVariants,
  type ButtonVariantProps
} from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export { buttonVariants } from "@/components/ui/button-variants";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";
