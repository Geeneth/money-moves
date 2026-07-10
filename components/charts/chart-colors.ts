/** Shared chart series colors, pulled from the --chart-1..8 CSS vars defined in globals.css. */
export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
