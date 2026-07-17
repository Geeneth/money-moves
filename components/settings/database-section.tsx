"use client";

import * as React from "react";
import { toast } from "sonner";
import { Database, ExternalLink, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export function DatabaseSection(): React.JSX.Element | null {
  const [dbPath, setDbPath] = React.useState<string | null>(null);
  const [studioLoading, setStudioLoading] = React.useState(false);
  const api = typeof window !== "undefined" ? window.electronAPI : undefined;

  // Only render this section when running inside Electron.
  if (!api) return null;

  React.useEffect(() => {
    api.getDbPath().then(setDbPath).catch(() => null);
  }, [api]);

  async function handleOpenFolder(): Promise<void> {
    if (!dbPath) return;
    const err = await api!.openPath(dbPath);
    if (err) toast.error("Couldn't open the database file.");
  }

  async function handleOpenStudio(): Promise<void> {
    setStudioLoading(true);
    try {
      await api!.openDrizzleStudio();
    } catch {
      toast.error("Couldn't start Drizzle Studio. Make sure the app has access to npm.");
    } finally {
      setStudioLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database</CardTitle>
        <CardDescription>
          Your data is stored locally in a SQLite file. You have full control over it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void handleOpenFolder()}>
            <FolderOpen className="h-4 w-4" />
            Open Database File
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={studioLoading}
            onClick={() => void handleOpenStudio()}
          >
            <ExternalLink className="h-4 w-4" />
            {studioLoading ? "Starting Drizzle Studio…" : "Open Drizzle Studio"}
          </Button>
        </div>

        {dbPath ? (
          <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <Database className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">Database location</p>
              <p className="break-all font-mono">{dbPath}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
