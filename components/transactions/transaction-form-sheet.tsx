"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transactionInput, type TransactionInput } from "@/lib/validation/schemas";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/types";
import { todayISO } from "@/lib/formatting/dates";
import { useCategories } from "@/hooks/use-categories";
import type { TransactionWithCategory } from "@/lib/repositories/transactions";

interface ApiEnvelope<T> {
  data: T;
}

interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing transaction to edit, or a partial prefill (e.g. from Duplicate). Omit for a fresh Add. */
  transaction?: TransactionWithCategory | (TransactionInput & { id?: string }) | null;
  /**
   * When provided, the sheet operates in "draft edit" mode: submitting calls this
   * callback with the edited values instead of posting to the API.
   */
  onSave?: (values: TransactionInput) => void;
}

const NO_CATEGORY = "__none__";

function defaultValues(transaction?: TransactionFormSheetProps["transaction"]): TransactionInput {
  if (transaction) {
    return {
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type as TransactionInput["type"],
      paymentMethod: transaction.paymentMethod as TransactionInput["paymentMethod"],
      categoryId: transaction.categoryId ?? null,
      notes: transaction.notes ?? null,
    };
  }
  return {
    date: todayISO(),
    description: "",
    amount: 0,
    type: "expense",
    paymentMethod: "credit",
    categoryId: null,
    notes: null,
  };
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  transaction,
  onSave,
}: TransactionFormSheetProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const editingId = transaction && "id" in transaction ? transaction.id : undefined;
  const isEdit = Boolean(editingId);
  const isDraft = Boolean(onSave);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionInput),
    defaultValues: defaultValues(transaction),
  });

  React.useEffect(() => {
    if (open) reset(defaultValues(transaction));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  const mutation = useMutation({
    mutationFn: async (values: TransactionInput) => {
      const url = editingId ? `/api/transactions/${editingId}` : "/api/transactions";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save transaction");
      }
      return (await res.json()) as ApiEnvelope<unknown>;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Transaction updated" : "Transaction added");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (onSave) {
      onSave(values);
      onOpenChange(false);
    } else {
      mutation.mutate(values);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isDraft ? "Review Transaction" : isEdit ? "Edit Transaction" : "Add Transaction"}
          </SheetTitle>
          <SheetDescription>
            {isDraft
              ? "Review and adjust the parsed details before adding."
              : isEdit
                ? "Update the details of this transaction."
                : "Log a new transaction."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="txn-date">Date</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DateField id="txn-date" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="txn-description">Description</Label>
            <Input id="txn-description" placeholder="Merchant or description" {...register("description")} />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="txn-amount">Amount</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  id="txn-amount"
                  value={field.value}
                  onChange={(cents) => field.onChange(cents ?? 0)}
                  placeholder="0.00"
                />
              )}
            />
            {errors.amount ? <p className="text-xs text-destructive">{errors.amount.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRANSACTION_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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

          <div className="space-y-1.5">
            <Label htmlFor="txn-notes">Notes</Label>
            <Textarea id="txn-notes" placeholder="Optional notes" {...register("notes")} />
          </div>

          <SheetFooter className="mt-auto pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isDraft ? "Confirm" : isEdit ? "Save changes" : "Add transaction"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
