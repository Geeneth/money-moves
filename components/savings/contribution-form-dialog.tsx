"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayISO } from "@/lib/formatting/dates";
import type { SavingsGoalRow } from "@/lib/database/schema";

export interface ContributionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: SavingsGoalRow[];
  defaultGoalId?: string;
}

async function recordContribution(input: {
  goalId: string;
  date: string;
  amount: number;
  notes: string | null;
}): Promise<void> {
  const res = await fetch("/api/savings/contributions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to record contribution");
  }
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  goals,
  defaultGoalId,
}: ContributionFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [goalId, setGoalId] = React.useState(defaultGoalId ?? goals[0]?.id ?? "");
  const [date, setDate] = React.useState(todayISO());
  const [amount, setAmount] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setGoalId(defaultGoalId ?? goals[0]?.id ?? "");
      setDate(todayISO());
      setAmount(null);
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultGoalId]);

  const mutation = useMutation({
    mutationFn: () =>
      recordContribution({ goalId, date, amount: amount ?? 0, notes: notes.trim() || null }),
    onSuccess: () => {
      toast.success("Contribution recorded");
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      queryClient.invalidateQueries({ queryKey: ["savings-contributions"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Contribution</DialogTitle>
          <DialogDescription>Log a manual contribution toward a savings goal.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-goal">Goal</Label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger id="c-goal">
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-date">Date</Label>
              <DateField id="c-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-amount">Amount</Label>
              <CurrencyInput id="c-amount" value={amount} onChange={setAmount} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!goalId || !amount || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Record contribution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
