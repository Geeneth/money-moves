import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "budget.db");
}

export function getBackupsDir(): string {
  return path.join(path.dirname(getDatabasePath()), "backups");
}

interface GlobalWithDb {
  __budgetDb?: { db: DB; sqlite: Database.Database };
}

function createConnection(): { db: DB; sqlite: Database.Database } {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db, sqlite };
}

/** Singleton connection, reused across hot reloads in dev. */
export function getDb(): DB {
  const g = globalThis as GlobalWithDb;
  if (!g.__budgetDb) g.__budgetDb = createConnection();
  return g.__budgetDb.db;
}

export function getSqlite(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (!g.__budgetDb) g.__budgetDb = createConnection();
  return g.__budgetDb.sqlite;
}

/**
 * Copy the live database to data/backups/ using SQLite's online backup API,
 * which is safe even while writes are in progress.
 */
export async function backupDatabaseFile(): Promise<string> {
  const sqlite = getSqlite();
  const dir = getBackupsDir();
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(dir, `budget-${stamp}.db`);
  await sqlite.backup(dest);
  return dest;
}
