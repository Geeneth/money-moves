"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  CalendarClock,
  Target,
  Info,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCents } from "@/lib/formatting/money";
import { formatDate, formatDateShort } from "@/lib/formatting/dates";
import type { DashboardData } from "@/lib/services/dashboard";

interface ApiEnvelope<T> {
  data: T;
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  const json = (await res.json()) as ApiEnvelope<DashboardData>;
  return json.data;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

function SummaryCard({
  title,
  icon: Icon,
  value,
  tooltip,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  tooltip: string;
  tone?: "default" | "destructive" | "warning";
}): React.JSX.Element {
  const valueColor =
    tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`How ${title} is calculated`} className="text-muted-foreground/70 hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">{tooltip}</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <motion.p
            key={String(value)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-2xl font-semibold tabular-nums ${valueColor}`}
          >
            {value}
          </motion.p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

export default function DashboardPage(): React.JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div>
        <PageHeader title="Dashboard" description="Your pay period at a glance." />

        {isLoading ? <DashboardSkeleton /> : null}

        {isError ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Couldn't load dashboard"
            description="Something went wrong fetching your data. Try refreshing the page."
          />
        ) : null}

        {data && !data.configured ? (
          <EmptyState
            icon={LayoutDashboard}
            title="Money Moves isn't set up yet"
            description="Head to Settings to configure your pay schedule before the dashboard can show numbers."
            action={
              <Button asChild>
                <Link href="/settings">Go to Settings</Link>
              </Button>
            }
          />
        ) : null}

        {data && data.configured && data.breakdown && data.period && data.pace ? (
          <DashboardBody data={data} />
        ) : null}
      </div>
    </TooltipProvider>
  );
}

function DashboardBody({ data }: { data: DashboardData }): React.JSX.Element {
  const currency = data.currency;
  const breakdown = data.breakdown!;
  const period = data.period!;
  const pace = data.pace!;

  const showWarning = pace.overspending || breakdown.availableToSpend < 0 || pace.billsUnderfunded || pace.overPace;

  return (
    <div className="space-y-6">
      {showWarning ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            {breakdown.availableToSpend < 0 || pace.overspending ? (
              <p className="font-medium">You&apos;ve spent more than what&apos;s available this pay period.</p>
            ) : null}
            {pace.overPace ? <p>You&apos;re spending faster than your recommended daily pace.</p> : null}
            {pace.billsUnderfunded ? (
              <p>Bills reserved so far don&apos;t cover what&apos;s due before your next payday.</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SummaryCard
          title="Available to Spend"
          icon={Wallet}
          value={formatCents(breakdown.availableToSpend, currency)}
          tooltip="Income − Savings − Bills − Expenses for the current pay period."
          tone={breakdown.availableToSpend < 0 ? "destructive" : "default"}
        />
        <SummaryCard
          title="Income This Pay Period"
          icon={TrendingUp}
          value={formatCents(breakdown.incomeReceived, currency)}
          tooltip="Received paychecks plus any other income transactions logged this period."
        />
        <SummaryCard
          title="Spending This Pay Period"
          icon={TrendingDown}
          value={formatCents(breakdown.expenses, currency)}
          tooltip="Expense transactions minus refunds, logged so far this period."
        />
        <SummaryCard
          title="Saved This Pay Period"
          icon={PiggyBank}
          value={formatCents(data.savings.allocatedThisPeriod, currency)}
          tooltip="Amount automatically allocated toward your savings goals from paychecks received this period."
        />
        <SummaryCard
          title="Reserved for Bills"
          icon={Receipt}
          value={formatCents(breakdown.billAllocation, currency)}
          tooltip="Amount set aside from received paychecks to cover recurring bills (annual bill total ÷ 26 per paycheck)."
          tone={pace.billsUnderfunded ? "warning" : "default"}
        />
        <SummaryCard
          title="Days Until Next Payday"
          icon={CalendarClock}
          value={data.daysRemaining}
          tooltip="Calendar days remaining in the current pay period, counting today."
        />
        <SummaryCard
          title="Recommended Daily Spending"
          icon={Target}
          value={formatCents(data.recommendedDaily, currency)}
          tooltip="Available to Spend divided by the days remaining in this pay period."
          tone={pace.overPace ? "warning" : "default"}
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pay Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current period</span>
                <span className="font-medium">
                  {formatDateShort(period.start)} – {formatDateShort(period.end)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previous payday</span>
                <span className="font-medium">{formatDate(period.previousPayday)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next payday</span>
                <span className="font-medium">{formatDate(period.nextPayday)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days remaining</span>
                <span className="font-medium">{data.daysRemaining}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Savings Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active goals</span>
                <span className="font-medium">{data.savings.activeGoals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total saved</span>
                <span className="font-medium">{formatCents(data.savings.totalSaved, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total target</span>
                <span className="font-medium">{formatCents(data.savings.totalTarget, currency)}</span>
              </div>
              <Progress
                value={
                  data.savings.totalTarget > 0
                    ? Math.min(100, Math.round((data.savings.totalSaved / data.savings.totalTarget) * 100))
                    : 0
                }
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bills due before your next payday.</p>
              ) : (
                <ul className="space-y-3">
                  {data.upcomingBills.map((bill) => (
                    <li key={bill.id} className="flex items-center justify-between text-sm">
                      <div className="space-y-0.5">
                        <p className="font-medium">{bill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDateShort(bill.nextDueDate)} · {bill.daysUntilDue}d
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {bill.isAutoPay ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Auto-pay
                          </Badge>
                        ) : null}
                        <span className="font-medium tabular-nums">{formatCents(bill.amount, currency)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions logged yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentTransactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="space-y-0.5">
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(t.date)} {t.categoryName ? `· ${t.categoryName}` : ""}
                      </p>
                    </div>
                    <span
                      className={`font-medium tabular-nums ${
                        t.type === "income" || t.type === "refund" ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {t.type === "income" || t.type === "refund" ? "+" : "-"}
                      {formatCents(t.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
