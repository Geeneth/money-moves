"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Mic, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/formatting/money";
import { todayISO } from "@/lib/formatting/dates";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";
import type { TransactionInput } from "@/lib/validation/schemas";

interface ApiEnvelope<T> {
  data: T;
}

interface ParseResponse {
  transactions: TransactionInput[];
  source: "openai" | "local";
  warning?: string;
}

interface TransactionDictationImporterProps {
  currency: string;
}

async function createTransaction(transaction: TransactionInput): Promise<void> {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to add transaction");
  }
}

export function TransactionDictationImporter({
  currency,
}: TransactionDictationImporterProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [text, setText] = React.useState("");
  const [date, setDate] = React.useState(todayISO());
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("debit");
  const [drafts, setDrafts] = React.useState<TransactionInput[]>([]);

  const parseMutation = useMutation({
    mutationFn: async (): Promise<ParseResponse> => {
      const res = await fetch("/api/transactions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, date, paymentMethod }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to parse dictation");
      }
      const json = (await res.json()) as ApiEnvelope<ParseResponse>;
      return json.data;
    },
    onSuccess: (result) => {
      setDrafts(result.transactions);
      if (result.transactions.length === 0) {
        toast.warning("No transactions found in that dictation");
        return;
      }
      toast.success(
        result.source === "openai"
          ? "Parsed with AI"
          : result.warning ?? "Parsed locally"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const draft of drafts) {
        await createTransaction(draft);
      }
    },
    onSuccess: () => {
      toast.success(drafts.length === 1 ? "Transaction added" : `${drafts.length} transactions added`);
      setText("");
      setDrafts([]);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function removeDraft(index: number): void {
    setDrafts((current) => current.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_160px_180px]">
          <div className="space-y-1.5">
            <Label htmlFor="transaction-dictation" className="inline-flex items-center gap-1.5">
              <Mic className="h-4 w-4" />
              Dictation
            </Label>
            <Textarea
              id="transaction-dictation"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="I spent 6 bucks on Tim Hortons and 4 dollars on a RedBull"
              className="min-h-20 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <DateField value={date} onChange={(event) => setDate(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => parseMutation.mutate()}
            disabled={text.trim().length < 3 || parseMutation.isPending}
            className="gap-1.5"
          >
            <WandSparkles className="h-4 w-4" />
            {parseMutation.isPending ? "Parsing" : "Parse"}
          </Button>
          {drafts.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              {saveMutation.isPending ? "Adding" : `Add ${drafts.length}`}
            </Button>
          ) : null}
        </div>

        {drafts.length > 0 ? (
          <div className="divide-y rounded-md border">
            {drafts.map((draft, index) => (
              <div key={`${draft.description}-${draft.amount}-${index}`} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{draft.description}</p>
                  <p className="text-xs text-muted-foreground">{draft.date}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCents(draft.amount, currency)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${draft.description}`}
                  onClick={() => removeDraft(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
