import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "focus-ring min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
