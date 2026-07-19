import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { settings } from "@/lib/database/schema";

const BCRYPT_ROUNDS = 12;

export async function getPasswordHash(): Promise<string | null> {
  const db = getDb();
  const row = db.select({ passwordHash: settings.passwordHash }).from(settings).where(eq(settings.id, 1)).get();
  return row?.passwordHash ?? null;
}

export async function setPassword(plaintext: string): Promise<void> {
  const hash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  const db = getDb();
  db.update(settings).set({ passwordHash: hash }).where(eq(settings.id, 1)).run();
}

export async function removePassword(): Promise<void> {
  const db = getDb();
  db.update(settings).set({ passwordHash: null }).where(eq(settings.id, 1)).run();
}

export async function verifyPassword(plaintext: string): Promise<boolean> {
  const hash = await getPasswordHash();
  if (!hash) return true; // no password set — always allow
  return bcrypt.compare(plaintext, hash);
}

export async function isPasswordSet(): Promise<boolean> {
  const hash = await getPasswordHash();
  return hash !== null;
}
