"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { formatCents } from "@/lib/formatting/money";

export interface BillAllocationProgressProps {
  data: { perPaycheck: number; annualTotal: number };
  currency: string;
  /** How much has actually been reserved for bills so far in the selected range. */
  reserved: number;
}

/** Shows how much of the annual bill load is covered by the per-paycheck reserve. */
export function BillAllocationProgress({
  data,
  currency,
  reserved,
}: BillAllocationProgressProps): React.JSX.Element {
  if (data.annualTotal === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No recurring bills configured yet.
      </div>
    );
  }
  const pct = data.annualTotal > 0 ? Math.min(100, Math.round((reserved / data.annualTotal) * 100)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Reserved this range</span>
        <span className="font-medium tabular-nums">
          {formatCents(reserved, currency)} / {formatCents(data.annualTotal, currency)}
        </span>
      </div>
      <Progress value={pct} />
      <p className="text-xs text-muted-foreground">
        {formatCents(data.perPaycheck, currency)} reserved per paycheck toward{" "}
        {formatCents(data.annualTotal, currency)} in annual recurring bills.
      </p>
    </div>
  );
}
