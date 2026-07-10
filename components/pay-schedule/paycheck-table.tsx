"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/formatting/dates";
import { formatCents } from "@/lib/formatting/money";
import type { PaycheckRow } from "@/lib/database/schema";

export interface PaycheckTableProps {
  paychecks: PaycheckRow[];
  currency: string;
  onEdit: (paycheck: PaycheckRow) => void;
  onMarkReceived: (paycheck: PaycheckRow) => void;
  emptyMessage: string;
}

async function deletePaycheck(id: string): Promise<void> {
  const res = await fetch(`/api/paychecks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to delete paycheck");
  }
}

export function PaycheckTable({
  paychecks,
  currency,
  onEdit,
  onMarkReceived,
  emptyMessage,
}: PaycheckTableProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = React.useState<PaycheckRow | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaycheck(id),
    onSuccess: () => {
      toast.success("Paycheck deleted");
      queryClient.invalidateQueries({ queryKey: ["paychecks"] });
      setToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setToDelete(null);
    },
  });

  if (paychecks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expected Date</TableHead>
            <TableHead>Expected Amount</TableHead>
            <TableHead>Actual Date</TableHead>
            <TableHead>Actual Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paychecks.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {formatDate(p.expectedDate)}
                {p.isManual ? (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    Manual
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="tabular-nums">{formatCents(p.expectedAmount, currency)}</TableCell>
              <TableCell>{p.actualDate ? formatDate(p.actualDate) : "—"}</TableCell>
              <TableCell className="tabular-nums">
                {p.actualAmount != null ? formatCents(p.actualAmount, currency) : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={p.status === "received" ? "success" : "outline"}>
                  {p.status === "received" ? "Received" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Paycheck actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {p.status === "pending" ? (
                      <DropdownMenuItem onSelect={() => onMarkReceived(p)}>Mark received</DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onSelect={() => onEdit(p)}>Edit</DropdownMenuItem>
                    {p.isManual ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setToDelete(p)}
                      >
                        Delete
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this paycheck?</AlertDialogTitle>
            <AlertDialogDescription>
              This manually added paycheck will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
