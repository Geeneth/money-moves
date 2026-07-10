import * as React from "react";
import { cn } from "@/lib/utils";

export interface DateFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

/**
 * Native date input styled to match `Input`. Value/onChange work with ISO
 * "yyyy-MM-dd" strings, consistent with dates elsewhere in the app.
 */
const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(({ className, ...props }, ref) => (
  <input
    type="date"
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
DateField.displayName = "DateField";

export { DateField };
