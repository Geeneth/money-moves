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
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { paycheckInput, type PaycheckInput } from "@/lib/validation/schemas";
import { PAYCHECK_STATUSES } from "@/lib/types";
import { todayISO } from "@/lib/formatting/dates";
import type { PaycheckRow } from "@/lib/database/schema";

export interface PaycheckFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paycheck?: PaycheckRow | null;
}

async function submitPaycheck(id: string | undefined, input: PaycheckInput): Promise<void> {
  const res = await fetch(id ? `/api/paychecks/${id}` : "/api/paychecks", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to save paycheck");
  }
}

function defaultsFor(paycheck?: PaycheckRow | null): PaycheckInput {
  return {
    expectedDate: paycheck?.expectedDate ?? todayISO(),
    expectedAmount: paycheck?.expectedAmount ?? 0,
    actualDate: paycheck?.actualDate ?? null,
    actualAmount: paycheck?.actualAmount ?? null,
    status: (paycheck?.status as PaycheckInput["status"]) ?? "pending",
    notes: paycheck?.notes ?? "",
  };
}

export function PaycheckFormDialog({
  open,
  onOpenChange,
  paycheck,
}: PaycheckFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const isEdit = Boolean(paycheck);

  const form = useForm<PaycheckInput>({
    resolver: zodResolver(paycheckInput),
    defaultValues: defaultsFor(paycheck),
  });

  React.useEffect(() => {
    if (open) form.reset(defaultsFor(paycheck));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paycheck?.id]);

  const mutation = useMutation({
    mutationFn: (input: PaycheckInput) => submitPaycheck(paycheck?.id, input),
    onSuccess: () => {
      toast.success(isEdit ? "Paycheck updated" : "Paycheck added");
      queryClient.invalidateQueries({ queryKey: ["paychecks"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Paycheck" : "Add Paycheck"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this paycheck's details."
              : "Add a one-off or bonus paycheck outside the regular schedule."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expectedDate">Expected date</Label>
              <DateField id="expectedDate" {...form.register("expectedDate")} />
              {form.formState.errors.expectedDate ? (
                <p className="text-xs text-destructive">{form.formState.errors.expectedDate.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedAmount">Expected amount</Label>
              <CurrencyInput
                id="expectedAmount"
                value={form.watch("expectedAmount")}
                onChange={(cents) => form.setValue("expectedAmount", cents ?? 0, { shouldValidate: true })}
              />
              {form.formState.errors.expectedAmount ? (
                <p className="text-xs text-destructive">{form.formState.errors.expectedAmount.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="actualDate">Actual date</Label>
              <DateField
                id="actualDate"
                value={form.watch("actualDate") ?? ""}
                onChange={(e) => form.setValue("actualDate", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actualAmount">Actual amount</Label>
              <CurrencyInput
                id="actualAmount"
                value={form.watch("actualAmount") ?? null}
                onChange={(cents) => form.setValue("actualAmount", cents)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as PaycheckInput["status"])}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYCHECK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "pending" ? "Pending" : "Received"}
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
              {isEdit ? "Save changes" : "Add paycheck"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
