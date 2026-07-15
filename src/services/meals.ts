import { boolFromDb, boolToDb, getDatabase } from "@/src/db/client";
import {
  addGregorianDays,
  eachDateInRange,
  formatDateOnly,
  todayDateStringInAppTz,
} from "@/src/lib/date-only";
import type { MealPlan, MealType, UserGender } from "@/src/types";

export type MealDeliveryFilters = {
  mawkibId?: number;
  mealType?: MealType;
  date?: string;
  query?: string;
  gender?: UserGender | "";
};

export type MealDeliveryItem = MealPlan & {
  pilgrimName: string;
  trackingCode: string;
  mawkibName: string;
};

export type MealReportDay = {
  date: string;
  /** مجموع تعداد غذای وعده‌های فعال */
  totalCount: number;
  /** مجموع تعداد غذای تحویل‌شده */
  servedCount: number;
  /** باقیمانده = کل − تحویل */
  remainingCount: number;
};

const ALL_MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function mapMealPlan(row: {
  id: number;
  reservationId: number;
  date: string;
  mealType: MealType;
  guestCount: number;
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
    guestCount: row.guestCount,
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

function assertPositiveGuestCount(guestCount: number) {
  if (!Number.isFinite(guestCount) || guestCount < 1) {
    throw new Error("تعداد نفرات باید حداقل ۱ باشد");
  }
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
    guestCount: number;
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

export async function updateMealGuestCount(
  ownerUserId: number,
  mealPlanId: number,
  guestCount: number,
): Promise<void> {
  assertPositiveGuestCount(guestCount);

  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE meal_plans SET
      guestCount = ?,
      updatedAt = datetime('now')
     WHERE id = ? AND isServed = 0 AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [guestCount, mealPlanId, ownerUserId],
  );
  if (!result.changes) {
    throw new Error("برنامه غذایی یافت نشد یا قبلاً تحویل داده شده است");
  }
}

export async function toggleMealServed(
  ownerUserId: number,
  mealPlanId: number,
  isServed: boolean,
  guestCount?: number,
): Promise<void> {
  if (isServed && guestCount != null) {
    assertPositiveGuestCount(guestCount);
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE meal_plans SET
      isServed = ?,
      guestCount = CASE WHEN ? = 1 AND ? IS NOT NULL THEN ? ELSE guestCount END,
      servedAt = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
      updatedAt = datetime('now')
     WHERE id = ? AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [
      boolToDb(isServed),
      boolToDb(isServed),
      guestCount ?? null,
      guestCount ?? null,
      boolToDb(isServed),
      mealPlanId,
      ownerUserId,
    ],
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
    maleGuestCount: number;
    femaleGuestCount: number;
  }>(
    `SELECT r.reservationDate, r.reservationEndDate, r.maleGuestCount, r.femaleGuestCount
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE r.id = ? AND m.ownerUserId = ?`,
    [reservationId, ownerUserId],
  );
  if (!reservation) throw new Error("رزرو یافت نشد");

  const guestCount = Math.max(
    1,
    reservation.maleGuestCount + reservation.femaleGuestCount,
  );

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
          reservationId, date, mealType, guestCount, isRequired, isServed, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
        [reservationId, date, mealType, guestCount, now, now],
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

export async function listMealDeliveryPlans(
  ownerUserId: number,
  filters: MealDeliveryFilters = {},
): Promise<MealDeliveryItem[]> {
  const db = await getDatabase();
  const date = filters.date ?? todayDateStringInAppTz();
  const clauses = [
    "m.ownerUserId = ?",
    "mp.date = ?",
    "r.status IN ('Confirmed', 'Completed')",
    "mp.isRequired = 1",
  ];
  const params: (string | number)[] = [ownerUserId, date];

  if (filters.mawkibId) {
    clauses.push("r.mawkibId = ?");
    params.push(filters.mawkibId);
  }
  if (filters.mealType) {
    clauses.push("mp.mealType = ?");
    params.push(filters.mealType);
  }
  if (filters.gender) {
    clauses.push("p.gender = ?");
    params.push(filters.gender);
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
    guestCount: number;
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

/** @deprecated Prefer listMealDeliveryPlans */
export async function listTodayMealPlans(
  ownerUserId: number,
  filters: { mawkibId?: number; mealType?: MealType; query?: string } = {},
): Promise<MealDeliveryItem[]> {
  return listMealDeliveryPlans(ownerUserId, filters);
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

/**
 * گزارش وعده غذایی روزانه برای یک موکب در بازهٔ تاریخ.
 * فقط وعده‌های فعال (isRequired) و رزروهای تایید/تکمیل‌شده لحاظ می‌شوند.
 */
export async function getMealReportRange(
  ownerUserId: number,
  mawkibId: number,
  startDate: string,
  endDate: string,
): Promise<{ days: MealReportDay[] }> {
  if (startDate > endDate) {
    throw new Error("بازه تاریخ نامعتبر است");
  }

  const db = await getDatabase();
  const mawkib = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM mawkibs WHERE id = ? AND ownerUserId = ?`,
    [mawkibId, ownerUserId],
  );
  if (!mawkib) throw new Error("موکب یافت نشد");

  const rows = await db.getAllAsync<{
    date: string;
    totalCount: number;
    servedCount: number;
  }>(
    `SELECT mp.date as date,
            COALESCE(SUM(CASE WHEN mp.isRequired = 1 THEN mp.guestCount ELSE 0 END), 0) as totalCount,
            COALESCE(SUM(CASE WHEN mp.isRequired = 1 AND mp.isServed = 1 THEN mp.guestCount ELSE 0 END), 0) as servedCount
     FROM meal_plans mp
     INNER JOIN reservations r ON r.id = mp.reservationId
     WHERE r.mawkibId = ?
       AND r.status IN ('Confirmed', 'Completed')
       AND mp.date >= ?
       AND mp.date <= ?
     GROUP BY mp.date
     ORDER BY mp.date ASC`,
    [mawkibId, startDate, endDate],
  );

  const byDate = new Map(
    rows.map((row) => [
      row.date,
      {
        totalCount: row.totalCount,
        servedCount: row.servedCount,
      },
    ]),
  );

  const days: MealReportDay[] = eachDateInRange(startDate, endDate).map(
    (day) => {
      const date = formatDateOnly(day);
      const stats = byDate.get(date) ?? { totalCount: 0, servedCount: 0 };
      const remainingCount = Math.max(0, stats.totalCount - stats.servedCount);
      return {
        date,
        totalCount: stats.totalCount,
        servedCount: stats.servedCount,
        remainingCount,
      };
    },
  );

  return { days };
}

/** بازه پیش‌فرض گزارش: ۷ روز حول امروز (۳ روز قبل تا ۳ روز بعد در محدوده مجاز). */
export function defaultMealReportRange(bounds?: {
  minDate: string;
  maxDate: string;
}): { startDate: string; endDate: string } {
  const today = todayDateStringInAppTz();
  let startDate = addGregorianDays(today, -3);
  let endDate = addGregorianDays(today, 3);

  if (bounds) {
    if (startDate < bounds.minDate) startDate = bounds.minDate;
    if (endDate > bounds.maxDate) endDate = bounds.maxDate;
    if (startDate > endDate) {
      startDate = bounds.minDate;
      endDate = bounds.maxDate;
    }
  }

  return { startDate, endDate };
}

/** حدود انتخاب تاریخ گزارش: بازه خدمت موکب، یا ۹۰ روز قبل تا ۳۰ روز بعد از امروز. */
export function getMealReportDateBounds(
  serviceStartDate?: string | null,
  serviceEndDate?: string | null,
): { minDate: string; maxDate: string; isServicePeriod: boolean } | null {
  const serviceStart = serviceStartDate?.slice(0, 10);
  const serviceEnd = serviceEndDate?.slice(0, 10);

  if (serviceStart && serviceEnd && serviceStart <= serviceEnd) {
    return {
      minDate: serviceStart,
      maxDate: serviceEnd,
      isServicePeriod: true,
    };
  }

  const today = todayDateStringInAppTz();
  return {
    minDate: addGregorianDays(today, -90),
    maxDate: addGregorianDays(today, 30),
    isServicePeriod: false,
  };
}
