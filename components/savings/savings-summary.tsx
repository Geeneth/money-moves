"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/formatting/money";
import { formatDateShort } from "@/lib/formatting/dates";
import type { SavingsContributionRow, SavingsGoalRow } from "@/lib/database/schema";

export interface SavingsSummaryProps {
  goals: SavingsGoalRow[];
  contributions: SavingsContributionRow[];
  allocationPerPaycheck: number;
  currency: string;
}

export function SavingsSummary({
  goals,
  contributions,
  allocationPerPaycheck,
  currency,
}: SavingsSummaryProps): React.JSX.Element {
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalRemaining = goals.reduce((sum, g) => sum + Math.max(0, g.targetAmount - g.currentAmount), 0);
  const goalsById = new Map(goals.map((g) => [g.id, g.name]));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Allocated Next Paycheck</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">{formatCents(allocationPerPaycheck, currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Saved</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">{formatCents(totalSaved, currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Remaining to Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">{formatCents(totalRemaining, currency)}</p>
        </CardContent>
      </Card>
      <Card className="lg:row-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Recent Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contributions recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {contributions.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{goalsById.get(c.goalId) ?? "Goal"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateShort(c.date)}</p>
                  </div>
                  <span className="tabular-nums font-medium">{formatCents(c.amount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
