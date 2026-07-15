import { getDatabase } from "@/src/db/client";
import {
  addGregorianDays,
  eachDateInRange,
  formatDateOnly,
  todayDateStringInAppTz,
} from "@/src/lib/date-only";
import {
  getInventoryHorizonMeta,
  MAWKIB_INVENTORY_HORIZON_DAYS,
  type InventoryHorizonMeta,
} from "@/src/lib/capacity-date-range";
import { reservationOccupiedDays } from "@/src/lib/reservation-occupancy";

export type MawkibDailyInventoryDay = {
  date: string;
  maleCapacity: number;
  femaleCapacity: number;
  reservedMale: number;
  reservedFemale: number;
  availableMale: number;
  availableFemale: number;
};

export type MawkibInventoryRangeResult = {
  mawkibId: number;
  mawkibName: string;
  startDate: string;
  endDate: string;
  horizon: InventoryHorizonMeta;
  days: MawkibDailyInventoryDay[];
};

export type MawkibCapacitySnapshot = {
  id: number;
  name: string;
  date: string;
  maleCapacity: number;
  femaleCapacity: number;
  reservedMale: number;
  reservedFemale: number;
  availableMale: number;
  availableFemale: number;
  totalCapacity: number;
  totalFilled: number;
  totalRemaining: number;
};

type MawkibCapacitySource = {
  id: number;
  name: string;
  maleCapacity: number;
  femaleCapacity: number;
};

type ConfirmedOccupancyRow = {
  mawkibId: number;
  reservationDate: string;
  reservationEndDate: string;
  maleGuestCount: number;
  femaleGuestCount: number;
};

function nowIso() {
  return new Date().toISOString();
}

async function ensureDayRows(
  mawkibId: number,
  startDate: string,
  endDate: string,
) {
  const db = await getDatabase();
  const existing = await db.getAllAsync<{ date: string }>(
    `SELECT date FROM mawkib_daily_inventory
     WHERE mawkibId = ? AND date >= ? AND date <= ?`,
    [mawkibId, startDate, endDate],
  );
  const existingSet = new Set(existing.map((row) => row.date.slice(0, 10)));
  const stamp = nowIso();

  for (const day of eachDateInRange(startDate, endDate)) {
    const key = formatDateOnly(day);
    if (existingSet.has(key)) continue;
    await db.runAsync(
      `INSERT OR IGNORE INTO mawkib_daily_inventory
        (mawkibId, date, reservedMale, reservedFemale, updatedAt)
       VALUES (?, ?, 0, 0, ?)`,
      [mawkibId, key, stamp],
    );
  }
}

async function applyDeltaToDays(
  mawkibId: number,
  days: string[],
  maleDelta: number,
  femaleDelta: number,
) {
  if (days.length === 0) return;
  const db = await getDatabase();
  const stamp = nowIso();

  for (const day of days) {
    await ensureDayRows(mawkibId, day, day);
    await db.runAsync(
      `UPDATE mawkib_daily_inventory
       SET reservedMale = MAX(0, reservedMale + ?),
           reservedFemale = MAX(0, reservedFemale + ?),
           updatedAt = ?
       WHERE mawkibId = ? AND date = ?`,
      [maleDelta, femaleDelta, stamp, mawkibId, day],
    );
  }
}

function aggregateOccupancyByDay(
  reservations: ConfirmedOccupancyRow[],
  horizonDayKeys: Set<string>,
) {
  const aggregated = new Map<string, { male: number; female: number }>();

  for (const reservation of reservations) {
    for (const day of reservationOccupiedDays(reservation)) {
      if (!horizonDayKeys.has(day)) continue;
      const current = aggregated.get(day) ?? { male: 0, female: 0 };
      current.male += reservation.maleGuestCount;
      current.female += reservation.femaleGuestCount;
      aggregated.set(day, current);
    }
  }

  return aggregated;
}

export async function applyReservationOccupancy(
  reservation: {
    mawkibId: number;
    reservationDate: string;
    reservationEndDate: string;
    maleGuestCount: number;
    femaleGuestCount: number;
  },
  direction: 1 | -1,
) {
  const days = reservationOccupiedDays(reservation);
  await applyDeltaToDays(
    reservation.mawkibId,
    days,
    direction * reservation.maleGuestCount,
    direction * reservation.femaleGuestCount,
  );
}

/** Rebuild inventory rows from Confirmed reservations — matches backend rebuild. */
export async function rebuildMawkibInventory(mawkibId: number) {
  const db = await getDatabase();
  const horizon = getInventoryHorizonMeta();
  await ensureDayRows(mawkibId, horizon.minDate, horizon.maxDate);

  await db.runAsync(
    `UPDATE mawkib_daily_inventory
     SET reservedMale = 0, reservedFemale = 0, updatedAt = ?
     WHERE mawkibId = ? AND date >= ? AND date <= ?`,
    [nowIso(), mawkibId, horizon.minDate, horizon.maxDate],
  );

  const confirmed = await db.getAllAsync<ConfirmedOccupancyRow>(
    `SELECT mawkibId, reservationDate, reservationEndDate,
            maleGuestCount, femaleGuestCount
     FROM reservations
     WHERE mawkibId = ? AND status = 'Confirmed'`,
    [mawkibId],
  );

  const horizonDayKeys = new Set(
    eachDateInRange(horizon.minDate, horizon.maxDate).map((day) =>
      formatDateOnly(day),
    ),
  );
  const aggregated = aggregateOccupancyByDay(confirmed, horizonDayKeys);
  const stamp = nowIso();

  for (const [date, totals] of aggregated) {
    await db.runAsync(
      `UPDATE mawkib_daily_inventory
       SET reservedMale = ?, reservedFemale = ?, updatedAt = ?
       WHERE mawkibId = ? AND date = ?`,
      [totals.male, totals.female, stamp, mawkibId, date],
    );
  }
}

export async function rebuildMawkibInventoryInRange(
  mawkibId: number,
  startDate: string,
  endDate: string,
) {
  const db = await getDatabase();
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  await ensureDayRows(mawkibId, start, end);

  await db.runAsync(
    `UPDATE mawkib_daily_inventory
     SET reservedMale = 0, reservedFemale = 0, updatedAt = ?
     WHERE mawkibId = ? AND date >= ? AND date <= ?`,
    [nowIso(), mawkibId, start, end],
  );

  const confirmed = await db.getAllAsync<ConfirmedOccupancyRow>(
    `SELECT mawkibId, reservationDate, reservationEndDate,
            maleGuestCount, femaleGuestCount
     FROM reservations
     WHERE mawkibId = ? AND status = 'Confirmed'`,
    [mawkibId],
  );

  const rangeDayKeys = new Set(
    eachDateInRange(start, end).map((day) => formatDateOnly(day)),
  );
  const aggregated = aggregateOccupancyByDay(confirmed, rangeDayKeys);
  const stamp = nowIso();

  for (const [date, totals] of aggregated) {
    await db.runAsync(
      `UPDATE mawkib_daily_inventory
       SET reservedMale = ?, reservedFemale = ?, updatedAt = ?
       WHERE mawkibId = ? AND date = ?`,
      [totals.male, totals.female, stamp, mawkibId, date],
    );
  }
}

export async function getInventoryRange(
  mawkibId: number,
  startDate: string,
  endDate: string,
): Promise<MawkibInventoryRangeResult> {
  const db = await getDatabase();
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);

  const mawkib = await db.getFirstAsync<{
    id: number;
    name: string;
    maleCapacity: number;
    femaleCapacity: number;
  }>(
    `SELECT id, name, maleCapacity, femaleCapacity FROM mawkibs WHERE id = ?`,
    [mawkibId],
  );
  if (!mawkib) throw new Error("موکب یافت نشد");

  await rebuildMawkibInventoryInRange(mawkibId, start, end);

  const rows = await db.getAllAsync<{
    date: string;
    reservedMale: number;
    reservedFemale: number;
  }>(
    `SELECT date, reservedMale, reservedFemale
     FROM mawkib_daily_inventory
     WHERE mawkibId = ? AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [mawkibId, start, end],
  );
  const rowByDate = new Map(
    rows.map((row) => [row.date.slice(0, 10), row] as const),
  );

  const days = eachDateInRange(start, end).map((day) => {
    const key = formatDateOnly(day);
    const row = rowByDate.get(key);
    const reservedMale = row?.reservedMale ?? 0;
    const reservedFemale = row?.reservedFemale ?? 0;
    return {
      date: key,
      maleCapacity: mawkib.maleCapacity,
      femaleCapacity: mawkib.femaleCapacity,
      reservedMale,
      reservedFemale,
      availableMale: Math.max(0, mawkib.maleCapacity - reservedMale),
      availableFemale: Math.max(0, mawkib.femaleCapacity - reservedFemale),
    };
  });

  return {
    mawkibId: mawkib.id,
    mawkibName: mawkib.name,
    startDate: start,
    endDate: end,
    horizon: getInventoryHorizonMeta(),
    days,
  };
}

export async function getSnapshotsForOwnerOnDate(
  ownerUserId: number,
  day: string = todayDateStringInAppTz(),
): Promise<MawkibCapacitySnapshot[]> {
  const db = await getDatabase();
  const date = day.slice(0, 10);

  const mawkibs = await db.getAllAsync<MawkibCapacitySource>(
    `SELECT id, name, maleCapacity, femaleCapacity
     FROM mawkibs
     WHERE ownerUserId = ?
     ORDER BY name COLLATE NOCASE ASC`,
    [ownerUserId],
  );

  if (mawkibs.length === 0) return [];

  await Promise.all(
    mawkibs.map((mawkib) => rebuildMawkibInventoryInRange(mawkib.id, date, date)),
  );

  const rows = await db.getAllAsync<{
    mawkibId: number;
    reservedMale: number;
    reservedFemale: number;
  }>(
    `SELECT mawkibId, reservedMale, reservedFemale
     FROM mawkib_daily_inventory
     WHERE date = ? AND mawkibId IN (${mawkibs.map(() => "?").join(",")})`,
    [date, ...mawkibs.map((m) => m.id)],
  );
  const rowByMawkibId = new Map(rows.map((row) => [row.mawkibId, row]));

  return mawkibs.map((mawkib) => {
    const row = rowByMawkibId.get(mawkib.id);
    const reservedMale = row?.reservedMale ?? 0;
    const reservedFemale = row?.reservedFemale ?? 0;
    const totalCapacity = mawkib.maleCapacity + mawkib.femaleCapacity;
    const totalFilled = reservedMale + reservedFemale;
    return {
      id: mawkib.id,
      name: mawkib.name,
      date,
      maleCapacity: mawkib.maleCapacity,
      femaleCapacity: mawkib.femaleCapacity,
      reservedMale,
      reservedFemale,
      availableMale: Math.max(0, mawkib.maleCapacity - reservedMale),
      availableFemale: Math.max(0, mawkib.femaleCapacity - reservedFemale),
      totalCapacity,
      totalFilled,
      totalRemaining: Math.max(0, totalCapacity - totalFilled),
    };
  });
}

/** Days around today for dashboard day carousel. */
export function getDashboardCarouselDates(
  radiusDays = 14,
): string[] {
  const today = todayDateStringInAppTz();
  const dates: string[] = [];
  for (let offset = -radiusDays; offset <= radiusDays; offset++) {
    dates.push(addGregorianDays(today, offset));
  }
  return dates;
}

export { MAWKIB_INVENTORY_HORIZON_DAYS, getInventoryHorizonMeta };
