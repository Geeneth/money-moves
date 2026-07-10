"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCents } from "@/lib/formatting/money";
import { formatDateShort } from "@/lib/formatting/dates";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/types";
import type { TransactionWithCategory } from "@/lib/repositories/transactions";

const INCOME_LIKE = new Set(["income", "refund"]);

interface TransactionsTableProps {
  data: TransactionWithCategory[];
  currency: string;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onEdit: (transaction: TransactionWithCategory) => void;
  onDuplicate: (transaction: TransactionWithCategory) => void;
  onDelete: (transaction: TransactionWithCategory) => void;
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }): React.JSX.Element {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-foreground">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export function TransactionsTable({
  data,
  currency,
  sorting,
  onSortingChange,
  onEdit,
  onDuplicate,
  onDelete,
}: TransactionsTableProps): React.JSX.Element {
  const columns = React.useMemo<ColumnDef<TransactionWithCategory>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader label="Date" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
        ),
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateShort(row.original.date)}</span>,
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <SortableHeader
            label="Merchant / Description"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.categoryName ?? "—"}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <SortableHeader label="Amount" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const positive = INCOME_LIKE.has(t.type);
          return (
            <span className={`font-medium tabular-nums ${positive ? "text-primary" : "text-destructive"}`}>
              {positive ? "+" : "-"}
              {formatCents(t.amount, currency)}
            </span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={INCOME_LIKE.has(row.original.type) ? "success" : "secondary"}>
            {TRANSACTION_TYPE_LABELS[row.original.type as keyof typeof TRANSACTION_TYPE_LABELS]}
          </Badge>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment Method",
        cell: ({ row }) =>
          PAYMENT_METHOD_LABELS[row.original.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS],
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="block max-w-[160px] truncate text-muted-foreground" title={row.original.notes ?? ""}>
            {row.original.notes ?? ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Row actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(t)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(t)}>Duplicate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(t)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [currency, onEdit, onDuplicate, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
