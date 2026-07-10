"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCents, formatBasisPoints } from "@/lib/formatting/money";
import { formatDate, todayISO } from "@/lib/formatting/dates";
import { estimatedCompletionDate, goalProgressPercent } from "@/lib/calculations/savings";
import type { ContributionType, GoalStatus } from "@/lib/types";
import type { SavingsGoalRow } from "@/lib/database/schema";

export interface GoalCardProps {
  goal: SavingsGoalRow;
  currency: string;
  paycheckCents: number;
  payFrequencyDays: number;
  onEdit: (goal: SavingsGoalRow) => void;
  onContribute: (goal: SavingsGoalRow) => void;
}

async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(`/api/savings/goals/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to delete goal");
  }
}

const STATUS_VARIANT: Record<GoalStatus, "success" | "secondary" | "outline"> = {
  active: "success",
  completed: "secondary",
  paused: "outline",
};

export function GoalCard({
  goal,
  currency,
  paycheckCents,
  payFrequencyDays,
  onEdit,
  onContribute,
}: GoalCardProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteGoal(goal.id),
    onSuccess: () => {
      toast.success("Goal deleted");
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      setConfirmDelete(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmDelete(false);
    },
  });

  const pct = goalProgressPercent(goal);
  const eta = estimatedCompletionDate(
    {
      contributionType: goal.contributionType as ContributionType,
      contributionAmount: goal.contributionAmount,
      status: goal.status as GoalStatus,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
    },
    paycheckCents,
    todayISO(),
    payFrequencyDays
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{goal.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[goal.status as GoalStatus]}>{goal.status}</Badge>
            <span className="text-xs text-muted-foreground">Priority {goal.priority}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Goal actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onContribute(goal)}>Record contribution</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(goal)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-semibold tabular-nums">{formatCents(goal.currentAmount, currency)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            of {formatCents(goal.targetAmount, currency)}
          </span>
        </div>
        <Progress value={pct} />
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">
              {goal.contributionType === "fixed"
                ? formatCents(goal.contributionAmount, currency)
                : formatBasisPoints(goal.contributionAmount)}
            </p>
            <p>per paycheck</p>
          </div>
          <div>
            <p className="font-medium text-foreground">{goal.targetDate ? formatDate(goal.targetDate) : "—"}</p>
            <p>target date</p>
          </div>
          <div className="col-span-2">
            <p className="font-medium text-foreground">{eta ? formatDate(eta) : "—"}</p>
            <p>estimated completion</p>
          </div>
        </div>
        {goal.notes ? <p className="text-xs text-muted-foreground">{goal.notes}</p> : null}
      </CardContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{goal.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This goal and its contribution history link will be removed. Contributions already recorded
              stay in your transaction history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
