"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { ArrowLeftRight, Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionFilters, EMPTY_FILTERS, type TransactionFiltersState } from "@/components/transactions/transaction-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSettings } from "@/hooks/use-settings";
import { formatCents } from "@/lib/formatting/money";
import { todayISO } from "@/lib/formatting/dates";
import type { TransactionWithCategory } from "@/lib/repositories/transactions";
import type { TransactionInput } from "@/lib/validation/schemas";

interface ApiEnvelope<T> {
  data: T;
}

const INCOME_LIKE = new Set(["income", "refund"]);

function buildQueryParams(filters: TransactionFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.type) params.set("type", filters.type);
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  return params;
}

async function fetchTransactions(filters: TransactionFiltersState): Promise<TransactionWithCategory[]> {
  const params = buildQueryParams(filters);
  const res = await fetch(`/api/transactions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load transactions");
  const json = (await res.json()) as ApiEnvelope<TransactionWithCategory[]>;
  return json.data;
}

type SheetState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; transaction: TransactionWithCategory }
  | { mode: "duplicate"; transaction: TransactionInput };

export default function TransactionsPage(): React.JSX.Element {
  const [filters, setFilters] = React.useState<TransactionFiltersState>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const effectiveFilters = React.useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }]);
  const [sheet, setSheet] = React.useState<SheetState>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionWithCategory | null>(null);

  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "CAD";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transactions", effectiveFilters],
    queryFn: () => fetchTransactions(effectiveFilters),
  });

  const transactions = data ?? [];

  const totals = React.useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      if (INCOME_LIKE.has(t.type)) income += t.amount;
      else expenses += t.amount;
    }
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  function handleExport(): void {
    const params = buildQueryParams(effectiveFilters);
    window.location.href = `/api/transactions/export?${params.toString()}`;
  }

  function handleDuplicate(transaction: TransactionWithCategory): void {
    setSheet({
      mode: "duplicate",
      transaction: {
        date: todayISO(),
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type as TransactionInput["type"],
        paymentMethod: transaction.paymentMethod as TransactionInput["paymentMethod"],
        categoryId: transaction.categoryId,
        notes: transaction.notes,
      },
    });
  }

  const sheetOpen = sheet.mode !== "closed";
  const sheetTransaction =
    sheet.mode === "edit" ? sheet.transaction : sheet.mode === "duplicate" ? sheet.transaction : null;

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Track spending across your pay periods."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setSheet({ mode: "add" })} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <TransactionFilters value={filters} onChange={setFilters} />

        {!isLoading && !isError ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Income (filtered)</span>
                <span className="font-semibold tabular-nums text-primary">
                  {formatCents(totals.income, currency)}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Expenses (filtered)</span>
                <span className="font-semibold tabular-nums text-destructive">
                  {formatCents(totals.expenses, currency)}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Net (filtered)</span>
                <span
                  className={`font-semibold tabular-nums ${totals.net >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {formatCents(totals.net, currency)}
                </span>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {isLoading ? <Skeleton className="h-64 w-full" /> : null}

        {isError ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Couldn't load transactions"
            description="Something went wrong. Try refreshing the page."
          />
        ) : null}

        {!isLoading && !isError && transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions found"
            description="Try adjusting your filters, or add your first transaction."
            action={
              <Button onClick={() => setSheet({ mode: "add" })} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            }
          />
        ) : null}

        {!isLoading && !isError && transactions.length > 0 ? (
          <TransactionsTable
            data={transactions}
            currency={currency}
            sorting={sorting}
            onSortingChange={setSorting}
            onEdit={(t) => setSheet({ mode: "edit", transaction: t })}
            onDuplicate={handleDuplicate}
            onDelete={setDeleteTarget}
          />
        ) : null}
      </div>

      <TransactionFormSheet
        open={sheetOpen}
        onOpenChange={(open) => !open && setSheet({ mode: "closed" })}
        transaction={sheetTransaction}
      />

      <DeleteTransactionDialog transaction={deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} />
    </div>
  );
}
