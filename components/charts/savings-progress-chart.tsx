"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { formatCents } from "@/lib/formatting/money";

export interface SavingsProgressChartProps {
  data: Array<{ name: string; current: number; target: number }>;
  currency: string;
}

/** Small progress bars per savings goal, used inside the Reports page. */
export function SavingsProgressChart({ data, currency }: SavingsProgressChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No savings goals yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((goal) => {
        const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
        return (
          <div key={goal.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{goal.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatCents(goal.current, currency)} / {formatCents(goal.target, currency)}
              </span>
            </div>
            <Progress value={pct} />
          </div>
        );
      })}
    </div>
  );
}
