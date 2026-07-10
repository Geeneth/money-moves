"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { centsToDollars, parseDollarsToCents } from "@/lib/formatting/money";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Amount in integer cents, or null when empty/invalid. */
  value: number | null;
  onChange: (cents: number | null) => void;
}

/**
 * Text input for dollar amounts. Displays/edits a dollar string while the
 * consumer's form state stays in integer cents.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onBlur, ...props }, ref) => {
    const [text, setText] = React.useState<string>(value == null ? "" : centsToDollars(value).toFixed(2));

    // Keep local text in sync when the external cents value changes and the
    // field isn't actively being edited (best-effort; simple controlled sync).
    React.useEffect(() => {
      setText(value == null ? "" : centsToDollars(value).toFixed(2));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <input
        type="text"
        inputMode="decimal"
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          onChange(parseDollarsToCents(next));
        }}
        onBlur={(e) => {
          const cents = parseDollarsToCents(text);
          if (cents == null) {
            setText("");
          } else {
            const dollars = centsToDollars(cents);
            setText(text.includes(".") ? dollars.toFixed(2) : String(dollars));
          }
          onBlur?.(e);
        }}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
