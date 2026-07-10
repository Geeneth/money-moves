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
import { Label } from "@/components/ui/label";
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
import { billPayInput, type BillPayInput } from "@/lib/validation/schemas";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { todayISO } from "@/lib/formatting/dates";
import type { BillWithCategory } from "@/lib/repositories/bills";

interface BillPayDialogProps {
  bill: BillWithCategory | null;
  onOpenChange: (open: boolean) => void;
}

export function BillPayDialog({ bill, onOpenChange }: BillPayDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BillPayInput>({
    resolver: zodResolver(billPayInput),
    defaultValues: {
      paidDate: todayISO(),
      amount: bill?.amount ?? 0,
      createTransaction: true,
      paymentMethod: "bank_transfer",
    },
  });

  React.useEffect(() => {
    if (bill) {
      reset({
        paidDate: todayISO(),
        amount: bill.amount,
        createTransaction: true,
        paymentMethod: "bank_transfer",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill]);

  const mutation = useMutation({
    mutationFn: async (values: BillPayInput) => {
      const res = await fetch(`/api/bills/${bill!.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Bill marked as paid");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={Boolean(bill)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>{bill ? `Record payment for "${bill.name}".` : ""}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Paid Date</Label>
            <Controller
              control={control}
              name="paidDate"
              render={({ field }) => <DateField id="pay-date" value={field.value} onChange={field.onChange} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  id="pay-amount"
                  value={field.value}
                  onChange={(cents) => field.onChange(cents ?? 0)}
                />
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

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="pay-create-txn" className="cursor-pointer">
              Create matching transaction
            </Label>
            <Controller
              control={control}
              name="createTransaction"
              render={({ field }) => (
                <Switch id="pay-create-txn" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              Mark as paid
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
