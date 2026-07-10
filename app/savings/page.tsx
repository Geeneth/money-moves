"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SavingsSummary } from "@/components/savings/savings-summary";
import { GoalCard } from "@/components/savings/goal-card";
import { GoalFormDialog } from "@/components/savings/goal-form-dialog";
import { ContributionFormDialog } from "@/components/savings/contribution-form-dialog";
import { savingsAllocationForPaycheck } from "@/lib/calculations/savings";
import type { ContributionType, GoalStatus } from "@/lib/types";
import type { SavingsContributionRow, SavingsGoalRow, SettingsRow } from "@/lib/database/schema";

interface ApiEnvelope<T> {
  data: T;
}

async function fetchSettings(): Promise<SettingsRow | null> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  const json = (await res.json()) as ApiEnvelope<SettingsRow | null>;
  return json.data;
}

async function fetchGoals(): Promise<SavingsGoalRow[]> {
  const res = await fetch("/api/savings/goals");
  if (!res.ok) throw new Error("Failed to load savings goals");
  const json = (await res.json()) as ApiEnvelope<SavingsGoalRow[]>;
  return json.data;
}

async function fetchContributions(): Promise<SavingsContributionRow[]> {
  const res = await fetch("/api/savings/contributions?limit=10");
  if (!res.ok) throw new Error("Failed to load contributions");
  const json = (await res.json()) as ApiEnvelope<SavingsContributionRow[]>;
  return json.data;
}

export default function SavingsPage(): React.JSX.Element {
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const goalsQuery = useQuery({ queryKey: ["savings-goals"], queryFn: fetchGoals });
  const contributionsQuery = useQuery({
    queryKey: ["savings-contributions"],
    queryFn: fetchContributions,
  });

  const [goalFormOpen, setGoalFormOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<SavingsGoalRow | null>(null);
  const [contributeOpen, setContributeOpen] = React.useState(false);
  const [contributeGoalId, setContributeGoalId] = React.useState<string | undefined>(undefined);

  const isLoading = settingsQuery.isLoading || goalsQuery.isLoading || contributionsQuery.isLoading;
  const isError = settingsQuery.isError || goalsQuery.isError || contributionsQuery.isError;
  const settings = settingsQuery.data;
  const goals = goalsQuery.data ?? [];
  const contributions = contributionsQuery.data ?? [];

  function openAdd(): void {
    setEditingGoal(null);
    setGoalFormOpen(true);
  }

  function openEdit(goal: SavingsGoalRow): void {
    setEditingGoal(goal);
    setGoalFormOpen(true);
  }

  function openContribute(goal: SavingsGoalRow): void {
    setContributeGoalId(goal.id);
    setContributeOpen(true);
  }

  const paycheckCents = settings?.defaultPayAmount ?? 0;
  const allocationPerPaycheck = savingsAllocationForPaycheck(
    goals.map((g) => ({
      contributionType: g.contributionType as ContributionType,
      contributionAmount: g.contributionAmount,
      status: g.status as GoalStatus,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
    })),
    paycheckCents
  );

  return (
    <div>
      <PageHeader
        title="Savings"
        description="Track progress toward your savings goals."
        actions={
          settings ? (
            <div className="flex gap-2">
              {goals.length > 0 ? (
                <Button variant="outline" onClick={() => setContributeOpen(true)}>
                  Record Contribution
                </Button>
              ) : null}
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> New Goal
              </Button>
            </div>
          ) : null
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          icon={PiggyBank}
          title="Couldn't load savings"
          description="Something went wrong fetching your data. Try refreshing the page."
        />
      ) : null}

      {!isLoading && !isError && !settings ? (
        <EmptyState
          icon={PiggyBank}
          title="Money Moves isn't set up yet"
          description="Head to Settings to configure your pay schedule first."
          action={
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          }
        />
      ) : null}

      {settings && !isLoading && !isError ? (
        <div className="space-y-6">
          <SavingsSummary
            goals={goals}
            contributions={contributions}
            allocationPerPaycheck={allocationPerPaycheck}
            currency={settings.currency}
          />

          {goals.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No savings goals yet"
              description="Create a goal to start allocating part of every paycheck toward it."
              action={<Button onClick={openAdd}>Create your first goal</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currency={settings.currency}
                  paycheckCents={paycheckCents}
                  payFrequencyDays={settings.payFrequencyDays}
                  onEdit={openEdit}
                  onContribute={openContribute}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <GoalFormDialog open={goalFormOpen} onOpenChange={setGoalFormOpen} goal={editingGoal} />
      <ContributionFormDialog
        open={contributeOpen}
        onOpenChange={(open) => {
          setContributeOpen(open);
          if (!open) setContributeGoalId(undefined);
        }}
        goals={goals}
        defaultGoalId={contributeGoalId}
      />
    </div>
  );
}
