"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { billInput, type BillInput } from "@/lib/validation/schemas";
import { BILL_FREQUENCIES, BILL_FREQUENCY_LABELS } from "@/lib/types";
import { todayISO } from "@/lib/formatting/dates";
import { useCategories } from "@/hooks/use-categories";
import type { BillWithCategory } from "@/lib/repositories/bills";

interface ApiEnvelope<T> {
  data: T;
}

interface BillFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: BillWithCategory | null;
}

const NO_CATEGORY = "__none__";
const MONTHLY_STYLE = new Set(["monthly", "quarterly", "semiannual"]);

function defaultValues(bill?: BillWithCategory | null): BillInput {
  if (bill) {
    return {
      name: bill.name,
      amount: bill.amount,
      frequency: bill.frequency as BillInput["frequency"],
      dueDay: bill.dueDay ?? null,
      nextDueDate: bill.nextDueDate,
      categoryId: bill.categoryId ?? null,
      isAutoPay: bill.isAutoPay,
      isActive: bill.isActive,
      notes: bill.notes ?? null,
    };
  }
  return {
    name: "",
    amount: 0,
    frequency: "monthly",
    dueDay: null,
    nextDueDate: todayISO(),
    categoryId: null,
    isAutoPay: false,
    isActive: true,
    notes: null,
  };
}

export function BillFormDialog({ open, onOpenChange, bill }: BillFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const isEdit = Boolean(bill);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BillInput>({
    resolver: zodResolver(billInput),
    defaultValues: defaultValues(bill),
  });

  React.useEffect(() => {
    if (open) reset(defaultValues(bill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bill]);

  const frequency = watch("frequency");

  const mutation = useMutation({
    mutationFn: async (values: BillInput) => {
      const url = bill ? `/api/bills/${bill.id}` : "/api/bills";
      const method = bill ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save bill");
      }
      return (await res.json()) as ApiEnvelope<unknown>;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Bill updated" : "Bill added");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Bill" : "Add Bill"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this recurring bill." : "Add a new recurring or one-time bill."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">Name</Label>
            <Input id="bill-name" placeholder="e.g. Rent" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Amount</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput
                    id="bill-amount"
                    value={field.value}
                    onChange={(cents) => field.onChange(cents ?? 0)}
                    placeholder="0.00"
                  />
                )}
              />
              {errors.amount ? <p className="text-xs text-destructive">{errors.amount.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILL_FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {BILL_FREQUENCY_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bill-next-due">Next Due Date</Label>
              <Controller
                control={control}
                name="nextDueDate"
                render={({ field }) => (
                  <DateField id="bill-next-due" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.nextDueDate ? (
                <p className="text-xs text-destructive">{errors.nextDueDate.message}</p>
              ) : null}
            </div>

            {MONTHLY_STYLE.has(frequency) ? (
              <div className="space-y-1.5">
                <Label htmlFor="bill-due-day">Due Day of Month</Label>
                <Controller
                  control={control}
                  name="dueDay"
                  render={({ field }) => (
                    <Input
                      id="bill-due-day"
                      type="number"
                      min={1}
                      max={31}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  )}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_CATEGORY}
                  onValueChange={(v) => field.onChange(v === NO_CATEGORY ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="bill-autopay" className="cursor-pointer">
              Auto-pay
            </Label>
            <Controller
              control={control}
              name="isAutoPay"
              render={({ field }) => (
                <Switch id="bill-autopay" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="bill-active" className="cursor-pointer">
              Active
            </Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch id="bill-active" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bill-notes">Notes</Label>
            <Textarea id="bill-notes" placeholder="Optional notes" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isEdit ? "Save changes" : "Add bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
