"use client";

import { useQuery } from "@tanstack/react-query";
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

export const settingsQueryKey = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
    staleTime: 60_000,
  });
}
