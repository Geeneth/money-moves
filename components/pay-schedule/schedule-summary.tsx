"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatting/dates";

export interface ScheduleSummaryProps {
  previousPayday: string;
  periodStart: string;
  periodEnd: string;
  nextPayday: string;
  daysUntilPayday: number;
}

export function ScheduleSummary({
  previousPayday,
  periodStart,
  periodEnd,
  nextPayday,
  daysUntilPayday,
}: ScheduleSummaryProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Previous Payday</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{formatDate(previousPayday)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Current Pay Period</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">
            {formatDate(periodStart)} – {formatDate(periodEnd)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Next Payday</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{formatDate(nextPayday)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Days Until Payday</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">{daysUntilPayday}</p>
        </CardContent>
      </Card>
    </div>
  );
}
