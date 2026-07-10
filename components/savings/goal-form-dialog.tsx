"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savingsGoalInput, type SavingsGoalInput } from "@/lib/validation/schemas";
import { GOAL_STATUSES } from "@/lib/types";
import { formatBasisPoints, parsePercentToBasisPoints } from "@/lib/formatting/money";
import type { SavingsGoalRow } from "@/lib/database/schema";

export interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: SavingsGoalRow | null;
}

async function submitGoal(id: string | undefined, input: SavingsGoalInput): Promise<void> {
  const res = await fetch(id ? `/api/savings/goals/${id}` : "/api/savings/goals", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to save savings goal");
  }
}

function defaultsFor(goal?: SavingsGoalRow | null): SavingsGoalInput {
  return {
    name: goal?.name ?? "",
    targetAmount: goal?.targetAmount ?? 0,
    currentAmount: goal?.currentAmount ?? 0,
    targetDate: goal?.targetDate ?? null,
    contributionType: (goal?.contributionType as SavingsGoalInput["contributionType"]) ?? "fixed",
    contributionAmount: goal?.contributionAmount ?? 0,
    priority: goal?.priority ?? 1,
    status: (goal?.status as SavingsGoalInput["status"]) ?? "active",
    notes: goal?.notes ?? "",
  };
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const isEdit = Boolean(goal);

  const form = useForm<SavingsGoalInput>({
    resolver: zodResolver(savingsGoalInput),
    defaultValues: defaultsFor(goal),
  });

  React.useEffect(() => {
    if (open) form.reset(defaultsFor(goal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal?.id]);

  const mutation = useMutation({
    mutationFn: (input: SavingsGoalInput) => submitGoal(goal?.id, input),
    onSuccess: () => {
      toast.success(isEdit ? "Goal updated" : "Goal created");
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const contributionType = form.watch("contributionType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Savings Goal" : "New Savings Goal"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this goal's details." : "Set a target and how much to contribute each paycheck."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} placeholder="Emergency fund" />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetAmount">Target amount</Label>
              <CurrencyInput
                id="targetAmount"
                value={form.watch("targetAmount")}
                onChange={(cents) => form.setValue("targetAmount", cents ?? 0, { shouldValidate: true })}
              />
              {form.formState.errors.targetAmount ? (
                <p className="text-xs text-destructive">{form.formState.errors.targetAmount.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentAmount">Current amount</Label>
              <CurrencyInput
                id="currentAmount"
                value={form.watch("currentAmount")}
                onChange={(cents) => form.setValue("currentAmount", cents ?? 0, { shouldValidate: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">Target date (optional)</Label>
              <DateField
                id="targetDate"
                value={form.watch("targetDate") ?? ""}
                onChange={(e) => form.setValue("targetDate", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority (1 highest)</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={10}
                {...form.register("priority", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contribution type</Label>
            <Tabs
              value={contributionType}
              onValueChange={(v) => form.setValue("contributionType", v as SavingsGoalInput["contributionType"])}
            >
              <TabsList>
                <TabsTrigger value="fixed">Fixed $</TabsTrigger>
                <TabsTrigger value="percent">Percent %</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contributionAmount">
              {contributionType === "fixed" ? "Amount per paycheck" : "Percent of each paycheck"}
            </Label>
            {contributionType === "fixed" ? (
              <CurrencyInput
                id="contributionAmount"
                value={form.watch("contributionAmount")}
                onChange={(cents) => form.setValue("contributionAmount", cents ?? 0, { shouldValidate: true })}
              />
            ) : (
              <Input
                id="contributionAmount"
                inputMode="decimal"
                defaultValue={formatBasisPoints(form.getValues("contributionAmount")).replace("%", "")}
                onChange={(e) => {
                  const bps = parsePercentToBasisPoints(e.target.value);
                  if (bps !== null) form.setValue("contributionAmount", bps, { shouldValidate: true });
                }}
                placeholder="10"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as SavingsGoalInput["status"])}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register("notes")} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {isEdit ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
