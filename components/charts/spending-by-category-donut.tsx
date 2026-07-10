"use client";

import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCents } from "@/lib/formatting/money";
import { chartColor } from "@/components/charts/chart-colors";

export interface SpendingByCategoryDonutProps {
  data: Array<{ name: string; value: number }>;
  currency: string;
}

export function SpendingByCategoryDonut({
  data,
  currency,
}: SpendingByCategoryDonutProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No categorized spending in this range yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={chartColor(i)} stroke="hsl(var(--card))" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCents(value, currency)}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={48}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => <span className="text-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
