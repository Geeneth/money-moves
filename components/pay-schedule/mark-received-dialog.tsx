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
import { todayISO } from "@/lib/formatting/dates";
import type { PaycheckRow } from "@/lib/database/schema";

export interface MarkReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paycheck: PaycheckRow | null;
}

async function markReceived(id: string, actualDate: string, actualAmount: number): Promise<void> {
  const res = await fetch(`/api/paychecks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "received", actualDate, actualAmount }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to mark paycheck as received");
  }
}

export function MarkReceivedDialog({
  open,
  onOpenChange,
  paycheck,
}: MarkReceivedDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [actualDate, setActualDate] = React.useState(todayISO());
  const [actualAmount, setActualAmount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open && paycheck) {
      setActualDate(paycheck.actualDate ?? todayISO());
      setActualAmount(paycheck.actualAmount ?? paycheck.expectedAmount);
    }
  }, [open, paycheck]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!paycheck) throw new Error("No paycheck selected");
      return markReceived(paycheck.id, actualDate, actualAmount ?? paycheck.expectedAmount);
    },
    onSuccess: () => {
      toast.success("Paycheck marked as received");
      queryClient.invalidateQueries({ queryKey: ["paychecks"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Paycheck Received</DialogTitle>
          <DialogDescription>
            Confirm the actual date and amount — they can differ from what was expected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mr-date">Actual date</Label>
            <DateField id="mr-date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mr-amount">Actual amount</Label>
            <CurrencyInput id="mr-amount" value={actualAmount} onChange={setActualAmount} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Mark received
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
