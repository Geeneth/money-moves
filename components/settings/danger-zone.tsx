"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Sparkles, Trash2 } from "lucide-react";
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

export function DangerZone(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetConfirmText, setResetConfirmText] = React.useState("");
  const [sampleOpen, setSampleOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [isLoadingSample, setIsLoadingSample] = React.useState(false);

  async function performReset(): Promise<void> {
    setIsResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Failed to reset data");
        return;
      }
      toast.success("All data has been reset. A safety backup was saved first.");
      setResetOpen(false);
      setResetConfirmText("");
      window.location.href = "/onboarding";
    } finally {
      setIsResetting(false);
    }
  }

  async function performLoadSample(): Promise<void> {
    setIsLoadingSample(true);
    try {
      const res = await fetch("/api/sample-data", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Failed to load sample data");
        return;
      }
      toast.success("Sample data loaded");
      setSampleOpen(false);
      queryClient.invalidateQueries();
    } finally {
      setIsLoadingSample(false);
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </CardTitle>
        <CardDescription>Destructive actions. Both are backed up automatically before running.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Load sample data</p>
            <p className="text-xs text-muted-foreground">
              Populate the app with example transactions, bills, and goals to explore features.
            </p>
          </div>
          <Button variant="outline" onClick={() => setSampleOpen(true)}>
            <Sparkles className="h-4 w-4" /> Load Sample Data
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-destructive/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Reset all local data</p>
            <p className="text-xs text-muted-foreground">
              Permanently wipes transactions, bills, paychecks, goals, and settings.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <Trash2 className="h-4 w-4" /> Reset All Data
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load sample data?</AlertDialogTitle>
            <AlertDialogDescription>
              If you already have real transactions, loading sample data will fail — reset first if you want
              a clean sample environment. Otherwise this just adds example data alongside what you have.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isLoadingSample} onClick={() => void performLoadSample()}>
              Load sample data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) setResetConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="font-medium text-destructive">
                  This permanently deletes everything: transactions, bills, paychecks, savings goals, and
                  settings. You'll be sent back through setup. This can't be undone from the app (a JSON
                  safety backup is saved to disk first).
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="reset-confirm" className="text-xs text-muted-foreground">
                    Type <span className="font-mono font-semibold">RESET</span> to confirm
                  </label>
                  <input
                    id="reset-confirm"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={resetConfirmText !== "RESET" || isResetting}
              onClick={() => void performReset()}
            >
              Permanently reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
