import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "focus-ring flex h-11 w-full rounded-md border bg-white px-3 text-sm shadow-sm transition placeholder:text-muted-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
