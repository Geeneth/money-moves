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
import { BILL_FREQUENCY_LABELS } from "@/lib/types";
import type { BillWithCategory } from "@/lib/repositories/bills";

interface BillsTableProps {
  data: BillWithCategory[];
  currency: string;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onEdit: (bill: BillWithCategory) => void;
  onMarkPaid: (bill: BillWithCategory) => void;
  onToggleActive: (bill: BillWithCategory) => void;
  onDelete: (bill: BillWithCategory) => void;
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }): React.JSX.Element {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-foreground">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export function BillsTable({
  data,
  currency,
  sorting,
  onSortingChange,
  onEdit,
  onMarkPaid,
  onToggleActive,
  onDelete,
}: BillsTableProps): React.JSX.Element {
  const columns = React.useMemo<ColumnDef<BillWithCategory>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader label="Name" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.categoryName ?? "—"}</span>,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <SortableHeader label="Amount" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{formatCents(row.original.amount, currency)}</span>
        ),
      },
      {
        accessorKey: "frequency",
        header: "Frequency",
        cell: ({ row }) => BILL_FREQUENCY_LABELS[row.original.frequency as keyof typeof BILL_FREQUENCY_LABELS],
      },
      {
        accessorKey: "nextDueDate",
        header: ({ column }) => (
          <SortableHeader
            label="Next Due Date"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => formatDateShort(row.original.nextDueDate),
      },
      {
        accessorKey: "isAutoPay",
        header: "Auto-pay",
        cell: ({ row }) =>
          row.original.isAutoPay ? <Badge variant="secondary">Auto-pay</Badge> : <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "outline"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
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
          const bill = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Row actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(bill)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkPaid(bill)}>Mark as paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleActive(bill)}>
                  {bill.isActive ? "Disable" : "Enable"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(bill)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [currency, onEdit, onMarkPaid, onToggleActive, onDelete]
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
