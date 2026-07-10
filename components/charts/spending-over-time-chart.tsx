"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/formatting/money";

export interface SpendingOverTimeChartProps {
  data: Array<{ date: string; label: string; spending: number }>;
  currency: string;
}

export function SpendingOverTimeChart({ data, currency }: SpendingOverTimeChartProps): React.JSX.Element {
  const hasSpending = data.some((d) => d.spending > 0);
  if (data.length === 0 || !hasSpending) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No spending recorded in this range yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="spendingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" minTickGap={24} />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => formatCents(v, currency, { compact: true })}
          width={64}
        />
        <Tooltip
          formatter={(value: number) => formatCents(value, currency)}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="spending"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#spendingFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
