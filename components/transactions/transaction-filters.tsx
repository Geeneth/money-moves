"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { useCategories } from "@/hooks/use-categories";

export interface TransactionFiltersState {
  search: string;
  from: string;
  to: string;
  categoryId: string;
  type: string;
  paymentMethod: string;
}

export const EMPTY_FILTERS: TransactionFiltersState = {
  search: "",
  from: "",
  to: "",
  categoryId: "",
  type: "",
  paymentMethod: "",
};

const ALL = "__all__";

interface TransactionFiltersProps {
  value: TransactionFiltersState;
  onChange: (value: TransactionFiltersState) => void;
}

export function TransactionFilters({ value, onChange }: TransactionFiltersProps): React.JSX.Element {
  const { data: categories } = useCategories();
  const hasActiveFilters = Object.values(value).some((v) => v !== "");

  function set<K extends keyof TransactionFiltersState>(key: K, next: TransactionFiltersState[K]): void {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="min-w-[200px] flex-1 space-y-1.5">
        <Label htmlFor="txn-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="txn-search"
            className="pl-8"
            placeholder="Description, notes, category…"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="txn-from">From</Label>
        <DateField id="txn-from" value={value.from} onChange={(e) => set("from", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="txn-to">To</Label>
        <DateField id="txn-to" value={value.to} onChange={(e) => set("to", e.target.value)} />
      </div>

      <div className="w-40 space-y-1.5">
        <Label>Category</Label>
        <Select
          value={value.categoryId === "" ? ALL : value.categoryId}
          onValueChange={(v) => set("categoryId", v === ALL ? "" : v)}
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

      <div className="w-40 space-y-1.5">
        <Label>Type</Label>
        <Select value={value.type === "" ? ALL : value.type} onValueChange={(v) => set("type", v === ALL ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-44 space-y-1.5">
        <Label>Payment Method</Label>
        <Select
          value={value.paymentMethod === "" ? ALL : value.paymentMethod}
          onValueChange={(v) => set("paymentMethod", v === ALL ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All methods</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
