"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/formatting/money";
import type { ReportsData } from "@/lib/services/reports";

export interface StatCalloutsProps {
  data: ReportsData;
}

export function StatCallouts({ data }: StatCalloutsProps): React.JSX.Element {
  const { vsPreviousPeriod } = data;
  const changePct = vsPreviousPeriod.changePct;
  // Spending down = improvement (olive/primary); spending up = worse (destructive).
  const improved = changePct !== null && changePct < 0;
  const worsened = changePct !== null && changePct > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Daily Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCents(data.totals.avgDailySpending, data.currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Vs. Previous Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex items-center gap-1.5 text-2xl font-semibold tabular-nums ${
              improved ? "text-primary" : worsened ? "text-destructive" : "text-foreground"
            }`}
          >
            {improved ? (
              <ArrowDown className="h-5 w-5" />
            ) : worsened ? (
              <ArrowUp className="h-5 w-5" />
            ) : (
              <Minus className="h-5 w-5" />
            )}
            {changePct === null ? "—" : `${Math.abs(changePct).toFixed(1)}%`}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {changePct === null
              ? "Not enough history yet"
              : improved
                ? "Less spending than last period"
                : worsened
                  ? "More spending than last period"
                  : "No change"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No spending yet</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topCategories.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-medium tabular-nums">{formatCents(c.value, data.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
