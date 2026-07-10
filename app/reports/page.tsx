"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PieChart as PieChartIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ReportRangePicker, type ReportPreset } from "@/components/reports/report-range-picker";
import { StatCallouts } from "@/components/reports/stat-callouts";
import { SpendingByCategoryDonut } from "@/components/charts/spending-by-category-donut";
import { IncomeAllocationBar } from "@/components/charts/income-allocation-bar";
import { SpendingOverTimeChart } from "@/components/charts/spending-over-time-chart";
import { SavingsProgressChart } from "@/components/charts/savings-progress-chart";
import { PeriodComparisonChart } from "@/components/charts/period-comparison-chart";
import { MonthlyIncomeExpensesChart } from "@/components/charts/monthly-income-expenses-chart";
import { BillAllocationProgress } from "@/components/charts/bill-allocation-progress";
import { formatDate, todayISO } from "@/lib/formatting/dates";
import type { ReportsData } from "@/lib/services/reports";

interface ApiEnvelope<T> {
  data: T;
}

async function fetchReports(preset: ReportPreset, from: string, to: string): Promise<ReportsData> {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    params.set("from", from);
    params.set("to", to);
  }
  const res = await fetch(`/api/reports?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load reports");
  const json = (await res.json()) as ApiEnvelope<ReportsData>;
  return json.data;
}

function ReportsSkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full" />
      ))}
    </div>
  );
}

export default function ReportsPage(): React.JSX.Element {
  const [preset, setPreset] = React.useState<ReportPreset>("current_period");
  const today = todayISO();
  const [customFrom, setCustomFrom] = React.useState(`${today.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = React.useState(today);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "reports",
      preset,
      preset === "custom" ? customFrom : null,
      preset === "custom" ? customTo : null,
    ],
    queryFn: () => fetchReports(preset, customFrom, customTo),
  });

  return (
    <div>
      <PageHeader title="Reports" description="Understand where your money goes, period over period." />

      <div className="mb-6">
        <ReportRangePicker
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {isLoading ? <ReportsSkeleton /> : null}

      {isError ? (
        <EmptyState
          icon={PieChartIcon}
          title="Couldn't load reports"
          description="Something went wrong fetching your data. Try refreshing the page."
        />
      ) : null}

      {data && !data.configured ? (
        <EmptyState
          icon={PieChartIcon}
          title="Money Moves isn't set up yet"
          description="Head to Settings to configure your pay schedule before reports can show anything."
          action={
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          }
        />
      ) : null}

      {data && data.configured ? <ReportsBody data={data} /> : null}
    </div>
  );
}

function ReportsBody({ data }: { data: ReportsData }): React.JSX.Element {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Showing {formatDate(data.range.from)} – {formatDate(data.range.to)}
      </p>

      <StatCallouts data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingByCategoryDonut data={data.byCategory} currency={data.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeAllocationBar data={data.allocation} currency={data.currency} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Spending Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingOverTimeChart data={data.overTime} currency={data.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Income vs. Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyIncomeExpensesChart data={data.monthly} currency={data.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pay Period Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <PeriodComparisonChart data={data.periodComparison} currency={data.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <SavingsProgressChart data={data.savingsGoals} currency={data.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <BillAllocationProgress
              data={data.billReserve}
              currency={data.currency}
              reserved={data.totals.billPayments}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
