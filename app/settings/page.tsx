"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PaySettingsSection } from "@/components/settings/pay-settings-section";
import { CategoryManager } from "@/components/settings/category-manager";
import { BackupSection } from "@/components/settings/backup-section";
import { DangerZone } from "@/components/settings/danger-zone";
import type { SettingsRow } from "@/lib/database/schema";

interface ApiEnvelope<T> {
  data: T;
}

async function fetchSettings(): Promise<SettingsRow | null> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to load settings");
  const json = (await res.json()) as ApiEnvelope<SettingsRow | null>;
  return json.data;
}

export default function SettingsPage(): React.JSX.Element {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences and data." />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          icon={SettingsIcon}
          title="Couldn't load settings"
          description="Something went wrong fetching your data. Try refreshing the page."
        />
      ) : null}

      {!isLoading && !isError && !settings ? (
        <EmptyState
          icon={SettingsIcon}
          title="Money Moves isn't set up yet"
          description="Complete onboarding first to create your settings."
        />
      ) : null}

      {settings ? (
        <div className="space-y-6">
          <PaySettingsSection settings={settings} />
          <CategoryManager />
          <BackupSection />
          <DangerZone />
        </div>
      ) : null}
    </div>
  );
}
