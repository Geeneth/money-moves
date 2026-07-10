"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/formatting/money";

export interface MonthlyIncomeExpensesChartProps {
  data: Array<{ month: string; income: number; expenses: number }>;
  currency: string;
}

export function MonthlyIncomeExpensesChart({
  data,
  currency,
}: MonthlyIncomeExpensesChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No monthly activity in this range yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
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
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
