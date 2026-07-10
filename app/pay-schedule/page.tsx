"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleSummary } from "@/components/pay-schedule/schedule-summary";
import { PaycheckTable } from "@/components/pay-schedule/paycheck-table";
import { PaycheckFormDialog } from "@/components/pay-schedule/paycheck-form-dialog";
import { MarkReceivedDialog } from "@/components/pay-schedule/mark-received-dialog";
import { periodFor, previousPayday, daysUntilNextPayday } from "@/lib/calculations/pay-periods";
import { todayISO } from "@/lib/formatting/dates";
import type { PaycheckRow, SettingsRow } from "@/lib/database/schema";

interface ApiEnvelope<T> {
  data: T;
}

async function fetchSettings(): Promise<SettingsRow | null> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  const json = (await res.json()) as ApiEnvelope<SettingsRow | null>;
  return json.data;
}

async function fetchPaychecks(): Promise<PaycheckRow[]> {
  const res = await fetch("/api/paychecks");
  if (!res.ok) throw new Error("Failed to load paychecks");
  const json = (await res.json()) as ApiEnvelope<PaycheckRow[]>;
  return json.data;
}

export default function PayScheduleLandingPage(): React.JSX.Element {
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const paychecksQuery = useQuery({ queryKey: ["paychecks"], queryFn: fetchPaychecks });

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PaycheckRow | null>(null);
  const [markReceivedOpen, setMarkReceivedOpen] = React.useState(false);
  const [markReceivedTarget, setMarkReceivedTarget] = React.useState<PaycheckRow | null>(null);

  const isLoading = settingsQuery.isLoading || paychecksQuery.isLoading;
  const isError = settingsQuery.isError || paychecksQuery.isError;
  const settings = settingsQuery.data;
  const paychecks = paychecksQuery.data ?? [];

  function openAdd(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(paycheck: PaycheckRow): void {
    setEditing(paycheck);
    setFormOpen(true);
  }

  function openMarkReceived(paycheck: PaycheckRow): void {
    setMarkReceivedTarget(paycheck);
    setMarkReceivedOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Pay Schedule"
        description="See your upcoming paychecks and pay periods."
        actions={
          settings ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Paycheck
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          icon={CalendarClock}
          title="Couldn't load pay schedule"
          description="Something went wrong fetching your data. Try refreshing the page."
        />
      ) : null}

      {!isLoading && !isError && !settings ? (
        <EmptyState
          icon={CalendarClock}
          title="Money Moves isn't set up yet"
          description="Head to Settings to configure your pay schedule."
          action={
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          }
        />
      ) : null}

      {settings ? (
        <PayScheduleBody
          settings={settings}
          paychecks={paychecks}
          onEdit={openEdit}
          onMarkReceived={openMarkReceived}
        />
      ) : null}

      <PaycheckFormDialog open={formOpen} onOpenChange={setFormOpen} paycheck={editing} />
      <MarkReceivedDialog
        open={markReceivedOpen}
        onOpenChange={setMarkReceivedOpen}
        paycheck={markReceivedTarget}
      />
    </div>
  );
}

function PayScheduleBody({
  settings,
  paychecks,
  onEdit,
  onMarkReceived,
}: {
  settings: SettingsRow;
  paychecks: PaycheckRow[];
  onEdit: (p: PaycheckRow) => void;
  onMarkReceived: (p: PaycheckRow) => void;
}): React.JSX.Element {
  const today = todayISO();
  const period = periodFor(today, settings.knownPayday, settings.payFrequencyDays);
  const prevPayday = previousPayday(today, settings.knownPayday, settings.payFrequencyDays);
  const daysUntil = daysUntilNextPayday(today, settings.knownPayday, settings.payFrequencyDays);

  const upcoming = paychecks
    .filter((p) => p.status === "pending" || p.expectedDate >= today)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
  const history = paychecks
    .filter((p) => p.status === "received" && p.expectedDate < today)
    .sort((a, b) => b.expectedDate.localeCompare(a.expectedDate));
  // Paychecks that don't cleanly fall into either bucket above (e.g. received but in the future) still show in history for visibility.
  const historyIds = new Set(history.map((p) => p.id));
  const upcomingIds = new Set(upcoming.map((p) => p.id));
  const leftover = paychecks.filter((p) => !historyIds.has(p.id) && !upcomingIds.has(p.id));

  return (
    <div className="space-y-6">
      <ScheduleSummary
        previousPayday={prevPayday}
        periodStart={period.start}
        periodEnd={period.end}
        nextPayday={period.nextPayday}
        daysUntilPayday={daysUntil}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paychecks</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <PaycheckTable
                paychecks={[...upcoming, ...leftover]}
                currency={settings.currency}
                onEdit={onEdit}
                onMarkReceived={onMarkReceived}
                emptyMessage="No upcoming paychecks yet."
              />
            </TabsContent>
            <TabsContent value="history">
              <PaycheckTable
                paychecks={history}
                currency={settings.currency}
                onEdit={onEdit}
                onMarkReceived={onMarkReceived}
                emptyMessage="No received paychecks yet."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Your anchor payday and pay frequency are managed in{" "}
        <Link href="/settings" className="underline underline-offset-2">
          Settings
        </Link>
        . Use "Add Paycheck" above for bonuses or one-off extra paychecks.
      </p>
    </div>
  );
}
