import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { categories, type CategoryRow } from "@/lib/database/schema";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { newId } from "@/lib/utils";
import type { CategoryInput } from "@/lib/validation/schemas";

export function listCategories(): CategoryRow[] {
  return getDb().select().from(categories).orderBy(asc(categories.name)).all();
}

export function createCategory(input: CategoryInput): CategoryRow {
  const db = getDb();
  const id = newId();
  db.insert(categories)
    .values({ id, name: input.name, type: input.type, icon: input.icon ?? null, isDefault: false })
    .run();
  const row = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!row) throw new Error("Failed to create category");
  return row;
}

export function updateCategory(id: string, input: CategoryInput): CategoryRow {
  const db = getDb();
  db.update(categories)
    .set({
      name: input.name,
      type: input.type,
      icon: input.icon ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(categories.id, id))
    .run();
  const row = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!row) throw new Error("Category not found");
  return row;
}

export function deleteCategory(id: string): void {
  getDb().delete(categories).where(eq(categories.id, id)).run();
}

/** Insert the default category set, skipping names that already exist. */
export function seedDefaultCategories(): void {
  const db = getDb();
  const existing = new Set(listCategories().map((c) => c.name.toLowerCase()));
  for (const cat of DEFAULT_CATEGORIES) {
    if (existing.has(cat.name.toLowerCase())) continue;
    db.insert(categories)
      .values({ id: newId(), name: cat.name, type: cat.type, icon: cat.icon, isDefault: true })
      .run();
  }
}
