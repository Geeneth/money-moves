"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface RestoreSummary {
  exportedAt: string;
  transactions: number;
  bills: number;
  paychecks: number;
  savingsGoals: number;
  savingsContributions: number;
  categories: number;
  billPayments: number;
}

export function BackupSection(): React.JSX.Element {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = React.useState<unknown>(null);
  const [summary, setSummary] = React.useState<RestoreSummary | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  function downloadBackup(): void {
    window.location.href = "/api/backup/export";
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const res = await fetch("/api/backup/import?mode=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const body = (await res.json()) as { data?: { summary: RestoreSummary }; error?: string };
      if (!res.ok || !body.data) {
        toast.error(body.error ?? "This file isn't a valid Money Moves backup.");
        return;
      }
      setPendingFile(json);
      setSummary(body.data.summary);
      setConfirmOpen(true);
    } catch {
      toast.error("Couldn't read that file. Make sure it's a Money Moves backup JSON export.");
    }
  }

  async function confirmRestore(): Promise<void> {
    if (!pendingFile) return;
    setIsRestoring(true);
    try {
      const res = await fetch("/api/backup/import?mode=confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingFile),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Failed to restore backup");
        return;
      }
      toast.success("Backup restored. A safety copy of your previous data was saved first.");
      setConfirmOpen(false);
      setPendingFile(null);
      setSummary(null);
      queryClient.invalidateQueries();
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>Export your full budget as JSON, or restore from a previous export.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadBackup}>
            <Download className="h-4 w-4" /> Download Backup (JSON)
          </Button>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Restore from File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Money Moves stores everything locally in a SQLite file at{" "}
            <code className="rounded bg-muted px-1 py-0.5">data/budget.db</code> inside the project folder.
            You can copy that file directly (while the app isn't writing to it) as an additional, complete
            backup.
          </p>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p className="font-medium text-warning">
                  This replaces all current data. A safety copy of what you have now is saved automatically
                  before restoring, but this action can't be undone from here.
                </p>
                {summary ? (
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <li>Transactions: {summary.transactions}</li>
                    <li>Bills: {summary.bills}</li>
                    <li>Paychecks: {summary.paychecks}</li>
                    <li>Savings goals: {summary.savingsGoals}</li>
                    <li>Contributions: {summary.savingsContributions}</li>
                    <li>Categories: {summary.categories}</li>
                    <li>Bill payments: {summary.billPayments}</li>
                  </ul>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRestoring}
              onClick={() => {
                void confirmRestore();
              }}
            >
              Restore & replace data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
