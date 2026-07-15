import { getDatabase } from "@/src/db/client";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { genderLabel } from "@/src/lib/labels";
import type { UserGender } from "@/src/types";

export type ReportBucket = {
  key: string;
  label: string;
  count: number;
};

export type PilgrimReports = {
  total: number;
  maleCount: number;
  femaleCount: number;
  unknownGenderCount: number;
  provinceCount: number;
  cityCount: number;
  countryCount: number;
  byGender: ReportBucket[];
  byCountry: ReportBucket[];
  byProvince: ReportBucket[];
  byCity: ReportBucket[];
};

export type MawkibCapacityReport = {
  id: number;
  name: string;
  /** تاریخ گزارش (ISO روز جاری) */
  reportDate: string;
  maleCapacity: number;
  femaleCapacity: number;
  totalCapacity: number;
  maleFilled: number;
  femaleFilled: number;
  totalFilled: number;
  maleRemaining: number;
  femaleRemaining: number;
  totalRemaining: number;
  presentCount: number;
  absentCount: number;
};

type CountRow = {
  key: string | null;
  count: number;
};

function remaining(capacity: number, filled: number) {
  return Math.max(0, capacity - filled);
}

function toBuckets(
  rows: CountRow[],
  labelFor: (key: string) => string,
  emptyLabel = "نامشخص",
): ReportBucket[] {
  return rows
    .map((row) => {
      const key = row.key?.trim() || "";
      return {
        key: key || "__unknown__",
        label: key ? labelFor(key) : emptyLabel,
        count: row.count ?? 0,
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

function topBuckets(buckets: ReportBucket[], limit = 8): ReportBucket[] {
  if (buckets.length <= limit) return buckets;
  const head = buckets.slice(0, limit - 1);
  const rest = buckets.slice(limit - 1);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);
  return [
    ...head,
    {
      key: "__other__",
      label: "سایر",
      count: otherCount,
    },
  ];
}

export async function getPilgrimReports(
  ownerUserId: number,
): Promise<PilgrimReports> {
  const db = await getDatabase();

  const linkedPilgrims = `
    SELECT DISTINCT p.id, p.gender, p.country, p.province, p.city
    FROM users p
    INNER JOIN reservations r ON r.pilgrimUserId = p.id
    INNER JOIN mawkibs m ON m.id = r.mawkibId
    WHERE m.ownerUserId = ?
  `;

  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM (${linkedPilgrims})`,
    [ownerUserId],
  );

  const genderRows = await db.getAllAsync<CountRow>(
    `SELECT gender as key, COUNT(*) as count
     FROM (${linkedPilgrims})
     GROUP BY gender`,
    [ownerUserId],
  );

  const countryRows = await db.getAllAsync<CountRow>(
    `SELECT country as key, COUNT(*) as count
     FROM (${linkedPilgrims})
     GROUP BY country`,
    [ownerUserId],
  );

  const provinceRows = await db.getAllAsync<CountRow>(
    `SELECT province as key, COUNT(*) as count
     FROM (${linkedPilgrims})
     GROUP BY province`,
    [ownerUserId],
  );

  const cityRows = await db.getAllAsync<CountRow>(
    `SELECT city as key, COUNT(*) as count
     FROM (${linkedPilgrims})
     GROUP BY city`,
    [ownerUserId],
  );

  const byGender = toBuckets(genderRows, (key) =>
    key === "Male" || key === "Female"
      ? genderLabel[key as UserGender]
      : key,
  );
  const byCountry = toBuckets(countryRows, (key) => key);
  const byProvince = topBuckets(toBuckets(provinceRows, (key) => key));
  const byCity = topBuckets(toBuckets(cityRows, (key) => key));

  const maleCount =
    byGender.find((item) => item.key === "Male")?.count ?? 0;
  const femaleCount =
    byGender.find((item) => item.key === "Female")?.count ?? 0;
  const unknownGenderCount = byGender
    .filter((item) => item.key !== "Male" && item.key !== "Female")
    .reduce((sum, item) => sum + item.count, 0);

  const provinceCount = provinceRows.filter(
    (row) => (row.key?.trim() || "").length > 0,
  ).length;
  const cityCount = cityRows.filter(
    (row) => (row.key?.trim() || "").length > 0,
  ).length;
  const countryCount = countryRows.filter(
    (row) => (row.key?.trim() || "").length > 0,
  ).length;

  return {
    total: totalRow?.total ?? 0,
    maleCount,
    femaleCount,
    unknownGenderCount,
    provinceCount,
    cityCount,
    countryCount,
    byGender,
    byCountry: topBuckets(byCountry, 6),
    byProvince,
    byCity,
  };
}

export async function getMawkibCapacityReports(
  ownerUserId: number,
  reportDate = todayDateStringInAppTz(),
): Promise<MawkibCapacityReport[]> {
  const db = await getDatabase();
  const day = reportDate.slice(0, 10);

  /**
   * اقامت فعال در روز جاری با بازهٔ نیمه‌باز [شروع، پایان)
   * — روز پایان جزء اشغال نیست.
   */
  const activeStayOnDay = `
    r.status = 'Confirmed'
    AND r.reservationDate <= ?
    AND ? < r.reservationEndDate
  `;

  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    maleCapacity: number;
    femaleCapacity: number;
    maleFilled: number;
    femaleFilled: number;
    presentCount: number;
    absentCount: number;
  }>(
    `SELECT
      m.id,
      m.name,
      m.maleCapacity,
      m.femaleCapacity,
      COALESCE((
        SELECT SUM(r.maleGuestCount)
        FROM reservations r
        WHERE r.mawkibId = m.id
          AND ${activeStayOnDay}
      ), 0) as maleFilled,
      COALESCE((
        SELECT SUM(r.femaleGuestCount)
        FROM reservations r
        WHERE r.mawkibId = m.id
          AND ${activeStayOnDay}
      ), 0) as femaleFilled,
      COALESCE((
        SELECT SUM(r.maleGuestCount + r.femaleGuestCount)
        FROM reservations r
        WHERE r.mawkibId = m.id
          AND ${activeStayOnDay}
          AND r.presenceState = 'PRESENT'
      ), 0) as presentCount,
      COALESCE((
        SELECT SUM(r.maleGuestCount + r.femaleGuestCount)
        FROM reservations r
        WHERE r.mawkibId = m.id
          AND ${activeStayOnDay}
          AND r.presenceState IN ('NOT_ARRIVED', 'TEMPORARILY_OUT')
      ), 0) as absentCount
     FROM mawkibs m
     WHERE m.ownerUserId = ?
     ORDER BY m.name COLLATE NOCASE ASC`,
    [day, day, day, day, day, day, day, day, ownerUserId],
  );

  return rows.map((row) => {
    const maleCapacity = row.maleCapacity ?? 0;
    const femaleCapacity = row.femaleCapacity ?? 0;
    const maleFilled = row.maleFilled ?? 0;
    const femaleFilled = row.femaleFilled ?? 0;
    const totalCapacity = maleCapacity + femaleCapacity;
    const totalFilled = maleFilled + femaleFilled;

    return {
      id: row.id,
      name: row.name,
      reportDate: day,
      maleCapacity,
      femaleCapacity,
      totalCapacity,
      maleFilled,
      femaleFilled,
      totalFilled,
      maleRemaining: remaining(maleCapacity, maleFilled),
      femaleRemaining: remaining(femaleCapacity, femaleFilled),
      totalRemaining: remaining(totalCapacity, totalFilled),
      presentCount: row.presentCount ?? 0,
      absentCount: row.absentCount ?? 0,
    };
  });
}
