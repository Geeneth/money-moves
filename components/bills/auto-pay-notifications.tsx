"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/formatting/money";
import { formatDateShort } from "@/lib/formatting/dates";
import type { RecentAutoPayPayment } from "@/lib/services/dashboard";

const STORAGE_KEY = "dismissed-autopay-notifications";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable — dismiss silently
  }
}

interface AutoPayNotificationsProps {
  payments: RecentAutoPayPayment[];
  currency: string;
}

export function AutoPayNotifications({
  payments,
  currency,
}: AutoPayNotificationsProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setDismissed(getDismissed());
    setMounted(true);
  }, []);

  const visible = React.useMemo(
    () => payments.filter((p) => !dismissed.has(p.id)),
    [payments, dismissed]
  );

  if (!mounted || visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }

  function dismissAll() {
    setDismissed((prev) => {
      const next = new Set(prev);
      visible.forEach((p) => next.add(p.id));
      saveDismissed(next);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((payment) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">{payment.billName}</span> auto-paid{" "}
                <span className="font-medium tabular-nums">
                  {formatCents(payment.amount, currency)}
                </span>{" "}
                on {formatDateShort(payment.dueDate)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => dismiss(payment.id)}
              className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
              aria-label={`Dismiss ${payment.billName} notification`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      {visible.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissAll}
            className="h-7 text-xs text-muted-foreground"
          >
            Dismiss all
          </Button>
        </div>
      )}
    </div>
  );
}
