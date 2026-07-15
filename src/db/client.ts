import * as SQLite from "expo-sqlite";
import {
  EXTRA_TABLES_SQL,
  MAWKIB_COLUMN_MIGRATIONS,
  MEAL_PLAN_COLUMN_MIGRATIONS,
  MIGRATION_SQL,
  SEED_ROLES_SQL,
  USER_COLUMN_MIGRATIONS,
} from "./migrations";

let database: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrateColumns(
  db: SQLite.SQLiteDatabase,
  table: "users" | "mawkibs" | "meal_plans",
  migrations: readonly (readonly [string, string])[],
): Promise<string[]> {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  const existingColumns = new Set(columns.map((column) => column.name));
  const added: string[] = [];

  for (const [name, definition] of migrations) {
    if (!existingColumns.has(name)) {
      await db.execAsync(
        `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`,
      );
      added.push(name);
    }
  }

  return added;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync("mokeb.db");
    await db.execAsync(MIGRATION_SQL);
    await migrateColumns(db, "users", USER_COLUMN_MIGRATIONS);
    await migrateColumns(db, "mawkibs", MAWKIB_COLUMN_MIGRATIONS);
    const addedMealColumns = await migrateColumns(
      db,
      "meal_plans",
      MEAL_PLAN_COLUMN_MIGRATIONS,
    );
    if (addedMealColumns.includes("guestCount")) {
      await db.runAsync(
        `UPDATE meal_plans SET guestCount = (
          SELECT MAX(1, COALESCE(r.maleGuestCount, 0) + COALESCE(r.femaleGuestCount, 0))
          FROM reservations r
          WHERE r.id = meal_plans.reservationId
        )`,
      );
    }
    await db.execAsync(EXTRA_TABLES_SQL);
    await db.execAsync(SEED_ROLES_SQL);
    database = db;
    return db;
  })();

  return initPromise;
}

export function boolFromDb(value: number | null | undefined): boolean {
  return value === 1;
}

export function boolToDb(value: boolean): number {
  return value ? 1 : 0;
}
