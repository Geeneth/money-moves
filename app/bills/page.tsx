"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { Download, Plus, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillsTable } from "@/components/bills/bills-table";
import { BillFormDialog } from "@/components/bills/bill-form-dialog";
import { BillPayDialog } from "@/components/bills/bill-pay-dialog";
import { DeleteBillDialog } from "@/components/bills/delete-bill-dialog";
import { useCategories } from "@/hooks/use-categories";
import { useSettings } from "@/hooks/use-settings";
import { formatCents } from "@/lib/formatting/money";
import { todayISO } from "@/lib/formatting/dates";
import type { BillWithCategory } from "@/lib/repositories/bills";

interface ApiEnvelope<T> {
  data: T;
}

interface BillsResponse {
  bills: BillWithCategory[];
  stats: {
    annualTotal: number;
    monthlyEstimate: number;
    perPaycheck: number;
    reservedThisPeriod: number;
    upcomingBeforePayday: string[];
  };
}

async function fetchBills(): Promise<BillsResponse> {
  const res = await fetch("/api/bills");
  if (!res.ok) throw new Error("Failed to load bills");
  const json = (await res.json()) as ApiEnvelope<BillsResponse>;
  return json.data;
}

const ALL = "__all__";

export default function BillsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const { data: categories } = useCategories();
  const currency = settings?.currency ?? "CAD";

  const { data, isLoading, isError } = useQuery({ queryKey: ["bills"], queryFn: fetchBills });

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "nextDueDate", desc: false }]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingBill, setEditingBill] = React.useState<BillWithCategory | null>(null);
  const [payingBill, setPayingBill] = React.useState<BillWithCategory | null>(null);
  const [deletingBill, setDeletingBill] = React.useState<BillWithCategory | null>(null);

  const toggleActiveMutation = useMutation({
    mutationFn: async (bill: BillWithCategory) => {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !bill.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update bill");
      return res.json();
    },
    onSuccess: (_, bill) => {
      toast.success(bill.isActive ? "Bill disabled" : "Bill enabled");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to update bill"),
  });

  const [quickPayPendingId, setQuickPayPendingId] = React.useState<string | null>(null);

  const quickPayMutation = useMutation({
    mutationFn: async (bill: BillWithCategory) => {
      setQuickPayPendingId(bill.id);
      const res = await fetch(`/api/bills/${bill.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidDate: todayISO(),
          amount: bill.amount,
          createTransaction: true,
          paymentMethod: "bank_transfer",
        }),
      });
      if (!res.ok) throw new Error("Failed to pay bill");
      return res.json();
    },
    onSuccess: (_, bill) => {
      toast.success(`${bill.name} marked as paid`);
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to mark bill as paid"),
    onSettled: () => setQuickPayPendingId(null),
  });

  const allBills = data?.bills ?? [];

  const filteredBills = React.useMemo(() => {
    return allBills.filter((b) => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === "active" && !b.isActive) return false;
      if (statusFilter === "inactive" && b.isActive) return false;
      if (categoryFilter && b.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [allBills, search, statusFilter, categoryFilter]);

  const activeBillsTotal = React.useMemo(
    () => allBills.filter((b) => b.isActive).reduce((sum, b) => sum + b.amount, 0),
    [allBills]
  );

  const upcomingCount = data?.stats.upcomingBeforePayday.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Bills"
        description="Keep upcoming bills on track."
        actions={
          <>
            <Button variant="outline" asChild className="gap-1.5">
              <a href="/api/bills/export">
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
            <Button
              onClick={() => {
                setEditingBill(null);
                setFormOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Bill
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          icon={Receipt}
          title="Couldn't load bills"
          description="Something went wrong. Try refreshing the page."
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Monthly Estimate</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatCents(data.stats.monthlyEstimate, currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Annual Total</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatCents(data.stats.annualTotal, currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Reserve per Paycheck</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatCents(data.stats.perPaycheck, currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Reserved This Period</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatCents(data.stats.reservedThisPeriod, currency)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {upcomingCount} bill{upcomingCount === 1 ? "" : "s"} due before next payday
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <span className="text-sm text-muted-foreground">Total value of active bills</span>
            <span className="text-lg font-semibold tabular-nums">{formatCents(activeBillsTotal, currency)}</span>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="bill-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bill-search"
                  className="pl-8"
                  placeholder="Search bills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="w-40 space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter === "" ? ALL : statusFilter} onValueChange={(v) => setStatusFilter(v === ALL ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44 space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryFilter === "" ? ALL : categoryFilter}
                onValueChange={(v) => setCategoryFilter(v === ALL ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {allBills.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No bills yet"
              description="Add your first recurring or one-time bill to start tracking it."
              action={
                <Button
                  onClick={() => {
                    setEditingBill(null);
                    setFormOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Bill
                </Button>
              }
            />
          ) : filteredBills.length === 0 ? (
            <EmptyState icon={Receipt} title="No bills match your filters" description="Try adjusting search or filters." />
          ) : (
            <BillsTable
              data={filteredBills}
              currency={currency}
              sorting={sorting}
              onSortingChange={setSorting}
              onEdit={(b) => {
                setEditingBill(b);
                setFormOpen(true);
              }}
              onMarkPaid={setPayingBill}
              onQuickPay={(b) => quickPayMutation.mutate(b)}
              onToggleActive={(b) => toggleActiveMutation.mutate(b)}
              onDelete={setDeletingBill}
              quickPayPendingId={quickPayPendingId}
            />
          )}
        </div>
      ) : null}

      <BillFormDialog open={formOpen} onOpenChange={setFormOpen} bill={editingBill} />
      <BillPayDialog bill={payingBill} onOpenChange={(open) => !open && setPayingBill(null)} />
      <DeleteBillDialog bill={deletingBill} onOpenChange={(open) => !open && setDeletingBill(null)} />
    </div>
  );
}
