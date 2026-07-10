import { eq } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { settings, type SettingsRow } from "@/lib/database/schema";
import type { SettingsInput } from "@/lib/validation/schemas";

const SETTINGS_ID = 1;

export function getSettings(): SettingsRow | null {
  const db = getDb();
  const rows = db.select().from(settings).limit(1).all();
  return rows[0] ?? null;
}

export function requireSettings(): SettingsRow {
  const row = getSettings();
  if (!row) throw new Error("App has not been set up yet");
  return row;
}

export function createSettings(input: SettingsInput): SettingsRow {
  const db = getDb();
  db.insert(settings)
    .values({ id: SETTINGS_ID, ...input })
    .run();
  return requireSettings();
}

export function updateSettings(input: Partial<SettingsInput>): SettingsRow {
  const db = getDb();
  db.update(settings)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(settings.id, SETTINGS_ID))
    .run();
  return requireSettings();
}
