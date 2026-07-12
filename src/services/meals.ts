import { boolFromDb, boolToDb, getDatabase } from "@/src/db/client";
import type { MealPlan, MealType } from "@/src/types";

const ALL_MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function mapMealPlan(row: {
  id: number;
  reservationId: number;
  date: string;
  mealType: MealType;
  isRequired: number;
  isServed: number;
  servedAt: string | null;
  createdAt: string;
  updatedAt: string;
}): MealPlan {
  return {
    id: row.id,
    reservationId: row.reservationId,
    date: row.date,
    mealType: row.mealType,
    isRequired: boolFromDb(row.isRequired),
    isServed: boolFromDb(row.isServed),
    servedAt: row.servedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const MEAL_ORDER_SQL = `CASE mp.mealType
  WHEN 'Breakfast' THEN 1
  WHEN 'Lunch' THEN 2
  WHEN 'Dinner' THEN 3
  ELSE 4
END`;

function eachDateInclusive(startIso: string, endIso: string): string[] {
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("بازه تاریخ اقامت نامعتبر است");
  }

  const dates: string[] = [];
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

export async function listMealPlans(
  ownerUserId: number,
  reservationId: number,
): Promise<MealPlan[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    reservationId: number;
    date: string;
    mealType: MealType;
    isRequired: number;
    isServed: number;
    servedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `SELECT mp.*
     FROM meal_plans mp
     INNER JOIN reservations r ON r.id = mp.reservationId
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE mp.reservationId = ? AND m.ownerUserId = ?
     ORDER BY mp.date ASC, ${MEAL_ORDER_SQL}`,
    [reservationId, ownerUserId],
  );

  return rows.map(mapMealPlan);
}

export async function toggleMealServed(
  ownerUserId: number,
  mealPlanId: number,
  isServed: boolean,
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE meal_plans SET
      isServed = ?,
      servedAt = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
      updatedAt = datetime('now')
     WHERE id = ? AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [boolToDb(isServed), boolToDb(isServed), mealPlanId, ownerUserId],
  );
  if (!result.changes) throw new Error("برنامه غذایی یافت نشد");
}

export async function toggleMealRequired(
  ownerUserId: number,
  mealPlanId: number,
  isRequired: boolean,
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE meal_plans SET
      isRequired = ?,
      isServed = CASE WHEN ? = 0 THEN 0 ELSE isServed END,
      servedAt = CASE WHEN ? = 0 THEN NULL ELSE servedAt END,
      updatedAt = datetime('now')
     WHERE id = ? AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [
      boolToDb(isRequired),
      boolToDb(isRequired),
      boolToDb(isRequired),
      mealPlanId,
      ownerUserId,
    ],
  );
  if (!result.changes) throw new Error("برنامه غذایی یافت نشد");
}

/**
 * حذف برنامه قبلی و ایجاد هر سه وعده از تاریخ شروع تا پایان اقامت.
 */
export async function regenerateMealPlans(
  ownerUserId: number,
  reservationId: number,
  mealTypes: MealType[] = ALL_MEAL_TYPES,
): Promise<MealPlan[]> {
  const db = await getDatabase();
  const reservation = await db.getFirstAsync<{
    reservationDate: string;
    reservationEndDate: string;
  }>(
    `SELECT r.reservationDate, r.reservationEndDate
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE r.id = ? AND m.ownerUserId = ?`,
    [reservationId, ownerUserId],
  );
  if (!reservation) throw new Error("رزرو یافت نشد");

  const dates = eachDateInclusive(
    reservation.reservationDate,
    reservation.reservationEndDate,
  );
  if (!dates.length) {
    throw new Error("بازه اقامت برای ایجاد برنامه غذایی کافی نیست");
  }

  await db.runAsync(
    `DELETE FROM meal_plans
     WHERE reservationId = ? AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [reservationId, ownerUserId],
  );

  const now = new Date().toISOString();
  for (const date of dates) {
    for (const mealType of mealTypes) {
      await db.runAsync(
        `INSERT INTO meal_plans (
          reservationId, date, mealType, isRequired, isServed, createdAt, updatedAt
        ) VALUES (?, ?, ?, 1, 0, ?, ?)`,
        [reservationId, date, mealType, now, now],
      );
    }
  }

  return listMealPlans(ownerUserId, reservationId);
}

/** @deprecated Prefer regenerateMealPlans */
export async function generateMealPlans(
  ownerUserId: number,
  reservationId: number,
  mealTypes: MealType[] = ALL_MEAL_TYPES,
): Promise<MealPlan[]> {
  return regenerateMealPlans(ownerUserId, reservationId, mealTypes);
}

export async function listTodayMealPlans(
  ownerUserId: number,
  filters: { mawkibId?: number; mealType?: MealType; query?: string } = {},
): Promise<
  (MealPlan & {
    pilgrimName: string;
    trackingCode: string;
    mawkibName: string;
  })[]
> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const clauses = [
    "m.ownerUserId = ?",
    "mp.date = ?",
    "r.status = 'Confirmed'",
    "mp.isRequired = 1",
  ];
  const params: (string | number)[] = [ownerUserId, today];

  if (filters.mawkibId) {
    clauses.push("r.mawkibId = ?");
    params.push(filters.mawkibId);
  }
  if (filters.mealType) {
    clauses.push("mp.mealType = ?");
    params.push(filters.mealType);
  }
  if (filters.query) {
    clauses.push(
      "(r.trackingCode LIKE ? OR p.fullName LIKE ? OR r.pilgrimMobile LIKE ?)",
    );
    const q = `%${filters.query.trim()}%`;
    params.push(q, q, q);
  }

  const rows = await db.getAllAsync<{
    id: number;
    reservationId: number;
    date: string;
    mealType: MealType;
    isRequired: number;
    isServed: number;
    servedAt: string | null;
    createdAt: string;
    updatedAt: string;
    pilgrimName: string;
    trackingCode: string;
    mawkibName: string;
  }>(
    `SELECT mp.*, p.fullName as pilgrimName, r.trackingCode, m.name as mawkibName
     FROM meal_plans mp
     INNER JOIN reservations r ON r.id = mp.reservationId
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE ${clauses.join(" AND ")}
     ORDER BY mp.isServed ASC, ${MEAL_ORDER_SQL}, p.fullName ASC`,
    params,
  );

  return rows.map((row) => ({
    ...mapMealPlan(row),
    pilgrimName: row.pilgrimName,
    trackingCode: row.trackingCode,
    mawkibName: row.mawkibName,
  }));
}

export function groupMealPlansByDate(meals: MealPlan[]) {
  const groups = new Map<string, MealPlan[]>();
  for (const meal of meals) {
    const current = groups.get(meal.date) ?? [];
    current.push(meal);
    groups.set(meal.date, current);
  }
  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    meals: items,
  }));
}
