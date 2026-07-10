"use client";

import { useQuery } from "@tanstack/react-query";
import type { CategoryRow } from "@/lib/database/schema";

interface ApiEnvelope<T> {
  data: T;
}

async function fetchCategories(): Promise<CategoryRow[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  const json = (await res.json()) as ApiEnvelope<CategoryRow[]>;
  return json.data;
}

export const categoriesQueryKey = ["categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
    staleTime: 60_000,
  });
}
