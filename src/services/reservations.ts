import { boolFromDb, getDatabase } from "@/src/db/client";
import { allocateNextReservationTrackingCode } from "@/src/lib/reservation-code";
import { reservationRowMatchesQuery } from "@/src/lib/reservation-lookup";
import { formatPersianDate } from "@/src/lib/persianDate";
import { formatMobileForLookup } from "@/src/lib/validation";
import type { PilgrimCardDetails } from "@/src/lib/reservation-track";
import type {
  Reservation,
  ReservationListFilters,
  ReservationStatus,
} from "@/src/types";
import {
  applyReservationOccupancy,
  rebuildMawkibInventory,
} from "./mawkib-inventory";
import { regenerateMealPlans } from "./meals";

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "Pending",
  "Confirmed",
];

/**
 * تداخل اقامت با بازهٔ نیمه‌باز [شروع، پایان):
 * روز پایان اقامت جزء اشغال نیست؛ مثلاً ۱→۲ و ۲→۵ تداخل ندارند.
 */
async function assertNoPilgrimStayOverlap(
  ownerUserId: number,
  input: {
    pilgrimUserId: number;
    reservationDate: string;
    reservationEndDate: string;
    excludeReservationId?: number;
  },
): Promise<void> {
  if (input.reservationEndDate <= input.reservationDate) {
    throw new Error("تاریخ پایان باید بعد از تاریخ شروع باشد");
  }

  const db = await getDatabase();
  const statusPlaceholders = ACTIVE_RESERVATION_STATUSES.map(() => "?").join(
    ", ",
  );
  const conflict = await db.getFirstAsync<{
    id: number;
    trackingCode: string;
    reservationDate: string;
    reservationEndDate: string;
  }>(
    `SELECT r.id, r.trackingCode, r.reservationDate, r.reservationEndDate
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE m.ownerUserId = ?
       AND r.pilgrimUserId = ?
       AND r.status IN (${statusPlaceholders})
       AND r.reservationDate < ?
       AND ? < r.reservationEndDate
       AND (? IS NULL OR r.id <> ?)
     ORDER BY r.reservationDate ASC
     LIMIT 1`,
    [
      ownerUserId,
      input.pilgrimUserId,
      ...ACTIVE_RESERVATION_STATUSES,
      input.reservationEndDate,
      input.reservationDate,
      input.excludeReservationId ?? null,
      input.excludeReservationId ?? null,
    ],
  );

  if (!conflict) return;

  throw new Error(
    `این زائر در بازهٔ انتخابی رزرو فعال دارد (کد ${conflict.trackingCode}: ${formatPersianDate(conflict.reservationDate)} تا ${formatPersianDate(conflict.reservationEndDate)})`,
  );
}

type ReservationRow = {
  id: number;
  mawkibId: number;
  pilgrimUserId: number;
  reservedByUserId: number;
  reservationDate: string;
  reservationEndDate: string;
  plannedCheckInTime: string | null;
  plannedCheckOutTime: string | null;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  maleGuestCount: number;
  femaleGuestCount: number;
  trackingCode: string;
  pilgrimMobile: string;
  companions: string | null;
  description: string | null;
  travelOrigin: string | null;
  cancellationNote: string | null;
  status: ReservationStatus;
  presenceState: Reservation["presenceState"];
  lastStatusUpdatedByUserId: number | null;
  lastStatusUpdatedAt: string | null;
  createdAt: string;
  mawkibName: string;
  pilgrimName: string;
  pilgrimNationalId?: string | null;
};

function mapReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    mawkibId: row.mawkibId,
    pilgrimUserId: row.pilgrimUserId,
    reservedByUserId: row.reservedByUserId,
    reservationDate: row.reservationDate,
    reservationEndDate: row.reservationEndDate,
    plannedCheckInTime: row.plannedCheckInTime,
    plannedCheckOutTime: row.plannedCheckOutTime,
    actualCheckInAt: row.actualCheckInAt,
    actualCheckOutAt: row.actualCheckOutAt,
    maleGuestCount: row.maleGuestCount,
    femaleGuestCount: row.femaleGuestCount,
    trackingCode: row.trackingCode,
    pilgrimMobile: row.pilgrimMobile,
    companions: row.companions,
    description: row.description,
    travelOrigin: row.travelOrigin,
    cancellationNote: row.cancellationNote,
    status: row.status,
    presenceState: row.presenceState,
    lastStatusUpdatedByUserId: row.lastStatusUpdatedByUserId,
    lastStatusUpdatedAt: row.lastStatusUpdatedAt,
    createdAt: row.createdAt,
    mawkibName: row.mawkibName,
    pilgrimName: row.pilgrimName,
    pilgrimNationalId: row.pilgrimNationalId ?? null,
  };
}

export async function listReservations(
  ownerUserId: number,
  filters: ReservationListFilters = {},
): Promise<Reservation[]> {
  const db = await getDatabase();
  const clauses = ["m.ownerUserId = ?"];
  const params: (string | number)[] = [ownerUserId];

  if (filters.query) {
    // فیلتر نام در JS اعمال می‌شود — LIKE یونیکد در SQLite ناپایدار است
  }
  if (filters.status) {
    clauses.push("r.status = ?");
    params.push(filters.status);
  }
  if (filters.presenceState) {
    clauses.push("r.presenceState = ?");
    params.push(filters.presenceState);
  }
  if (filters.mawkibId) {
    clauses.push("r.mawkibId = ?");
    params.push(filters.mawkibId);
  }
  if (filters.dateFrom) {
    clauses.push("r.reservationDate >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push("r.reservationDate <= ?");
    params.push(filters.dateTo);
  }

  const rows = await db.getAllAsync<ReservationRow>(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName,
            p.nationalId as pilgrimNationalId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE ${clauses.join(" AND ")}
     ORDER BY r.createdAt DESC`,
    params,
  );

  const mapped = rows.map(mapReservation);
  if (!filters.query?.trim()) return mapped;
  return mapped.filter((row) => reservationRowMatchesQuery(row, filters.query!));
}

export async function countReservations(ownerUserId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE m.ownerUserId = ?`,
    [ownerUserId],
  );
  return row?.count ?? 0;
}

export async function getReservationById(
  ownerUserId: number,
  id: number,
): Promise<Reservation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReservationRow>(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE r.id = ? AND m.ownerUserId = ?`,
    [id, ownerUserId],
  );
  return row ? mapReservation(row) : null;
}

type PilgrimCardRow = ReservationRow & {
  mawkibAddress: string;
  mawkibPhone: string;
  mawkibImageUrl: string | null;
  mawkibLatitude: number | null;
  mawkibLongitude: number | null;
  neshanAddressUrl: string | null;
  ownerName: string;
  ownerPhone: string;
  pilgrimGender: string | null;
};

export async function getPilgrimCardDetails(
  ownerUserId: number,
  reservationId: number,
): Promise<PilgrimCardDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PilgrimCardRow>(
    `SELECT r.*,
            m.name as mawkibName,
            m.address as mawkibAddress,
            m.phoneNumber as mawkibPhone,
            m.imageUrl as mawkibImageUrl,
            m.latitude as mawkibLatitude,
            m.longitude as mawkibLongitude,
            m.neshanAddressUrl,
            p.fullName as pilgrimName,
            p.gender as pilgrimGender,
            o.fullName as ownerName,
            o.mobileNumber as ownerPhone
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     INNER JOIN users o ON o.id = m.ownerUserId
     WHERE r.id = ? AND m.ownerUserId = ?`,
    [reservationId, ownerUserId],
  );

  if (!row) return null;

  const pilgrimGender =
    row.pilgrimGender === "Male" || row.pilgrimGender === "Female"
      ? row.pilgrimGender
      : null;

  return {
    reservation: mapReservation(row),
    mawkibName: row.mawkibName,
    mawkibAddress: row.mawkibAddress,
    mawkibPhone: row.mawkibPhone,
    mawkibImageUrl: row.mawkibImageUrl,
    mawkibLatitude: row.mawkibLatitude,
    mawkibLongitude: row.mawkibLongitude,
    neshanAddressUrl: row.neshanAddressUrl,
    ownerName: row.ownerName,
    ownerPhone: row.ownerPhone,
    pilgrimName: row.pilgrimName,
    pilgrimGender,
  };
}

export async function cancelReservation(
  ownerUserId: number,
  id: number,
): Promise<Reservation> {
  return updateReservation(ownerUserId, id, { status: "Cancelled" });
}

export async function createReservation(
  ownerUserId: number,
  input: {
    mawkibId: number;
    pilgrimUserId: number;
    reservationDate: string;
    reservationEndDate: string;
    maleGuestCount: number;
    femaleGuestCount: number;
    pilgrimMobile: string;
    companions?: string;
    description?: string;
    travelOrigin?: string;
    trackingCode?: string;
    status?: ReservationStatus;
    reservedByUserId?: number;
  },
): Promise<Reservation> {
  if (input.maleGuestCount < 0 || input.femaleGuestCount < 0) {
    throw new Error("تعداد مهمان نمی‌تواند منفی باشد");
  }
  if (input.maleGuestCount + input.femaleGuestCount <= 0) {
    throw new Error("حداقل یک مهمان لازم است");
  }

  const db = await getDatabase();
  const mawkib = await db.getFirstAsync<{
    id: number;
    mealPlanManagementEnabled: number;
    recordCheckInOnReservationConfirm: number;
  }>(
    `SELECT id, mealPlanManagementEnabled, recordCheckInOnReservationConfirm
     FROM mawkibs WHERE id = ? AND ownerUserId = ?`,
    [input.mawkibId, ownerUserId],
  );
  if (!mawkib) throw new Error("موکب یافت نشد");

  const pilgrim = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE id = ?",
    [input.pilgrimUserId],
  );
  if (!pilgrim) throw new Error("زائر یافت نشد");

  const status = input.status ?? "Confirmed";
  if (ACTIVE_RESERVATION_STATUSES.includes(status)) {
    await assertNoPilgrimStayOverlap(ownerUserId, {
      pilgrimUserId: input.pilgrimUserId,
      reservationDate: input.reservationDate,
      reservationEndDate: input.reservationEndDate,
    });
  }

  const customTrackingCode = input.trackingCode?.trim();
  let trackingCode: string;

  if (customTrackingCode) {
    if (customTrackingCode.length > 64) {
      throw new Error("کد رزرو حداکثر ۶۴ کاراکتر می‌تواند باشد");
    }

    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM reservations WHERE trackingCode = ?",
      [customTrackingCode],
    );
    if (existing) {
      throw new Error("این کد رزرو قبلاً ثبت شده است");
    }

    trackingCode = customTrackingCode;
  } else {
    trackingCode = await allocateNextReservationTrackingCode(db);
  }

  const mobile = formatMobileForLookup(input.pilgrimMobile);
  const shouldCheckInOnConfirm =
    status === "Confirmed" &&
    boolFromDb(mawkib.recordCheckInOnReservationConfirm);
  const now = new Date().toISOString();
  const reservedByUserId = input.reservedByUserId ?? ownerUserId;

  const result = await db.runAsync(
    `INSERT INTO reservations (
      mawkibId, pilgrimUserId, reservedByUserId,
      reservationDate, reservationEndDate,
      maleGuestCount, femaleGuestCount,
      trackingCode, pilgrimMobile,
      companions, description, travelOrigin,
      status, presenceState, actualCheckInAt,
      lastStatusUpdatedByUserId, lastStatusUpdatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.mawkibId,
      input.pilgrimUserId,
      reservedByUserId,
      input.reservationDate,
      input.reservationEndDate,
      input.maleGuestCount,
      input.femaleGuestCount,
      trackingCode,
      mobile,
      input.companions?.trim() || null,
      input.description?.trim() || null,
      input.travelOrigin?.trim() || null,
      status,
      shouldCheckInOnConfirm ? "PRESENT" : "NOT_ARRIVED",
      shouldCheckInOnConfirm ? now : null,
      ownerUserId,
      now,
    ],
  );

  const reservationId = result.lastInsertRowId;

  if (shouldCheckInOnConfirm) {
    await db.runAsync(
      `INSERT INTO reservation_events (
        reservationId, eventType, createdByUserId, description, createdAt
      ) VALUES (?, 'CHECK_IN', ?, ?, ?)`,
      [reservationId, reservedByUserId, "ثبت خودکار ورود هنگام تأیید رزرو", now],
    );
  }

  if (boolFromDb(mawkib.mealPlanManagementEnabled)) {
    await regenerateMealPlans(ownerUserId, reservationId);
  }

  const reservation = await getReservationById(ownerUserId, reservationId);
  if (!reservation) throw new Error("خطا در ثبت رزرو");

  if (reservation.status === "Confirmed") {
    await applyReservationOccupancy(
      {
        mawkibId: reservation.mawkibId,
        reservationDate: reservation.reservationDate,
        reservationEndDate: reservation.reservationEndDate,
        maleGuestCount: reservation.maleGuestCount,
        femaleGuestCount: reservation.femaleGuestCount,
      },
      1,
    );
  }

  return reservation;
}

export async function updateReservation(
  ownerUserId: number,
  id: number,
  input: Partial<{
    mawkibId: number;
    pilgrimUserId: number;
    pilgrimMobile: string;
    reservationDate: string;
    reservationEndDate: string;
    maleGuestCount: number;
    femaleGuestCount: number;
    companions: string;
    description: string;
    travelOrigin: string;
    status: ReservationStatus;
    cancellationNote: string;
  }>,
): Promise<Reservation> {
  if (
    (input.maleGuestCount !== undefined && input.maleGuestCount < 0) ||
    (input.femaleGuestCount !== undefined && input.femaleGuestCount < 0)
  ) {
    throw new Error("تعداد مهمان نمی‌تواند منفی باشد");
  }
  if (
    input.maleGuestCount !== undefined &&
    input.femaleGuestCount !== undefined &&
    input.maleGuestCount + input.femaleGuestCount <= 0
  ) {
    throw new Error("حداقل یک مهمان لازم است");
  }

  const db = await getDatabase();
  const previous = await getReservationById(ownerUserId, id);
  if (!previous) throw new Error("رزرو یافت نشد");

  if (input.mawkibId !== undefined) {
    const mawkib = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM mawkibs WHERE id = ? AND ownerUserId = ?",
      [input.mawkibId, ownerUserId],
    );
    if (!mawkib) throw new Error("موکب یافت نشد");
  }

  if (input.pilgrimUserId !== undefined) {
    const pilgrim = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM users WHERE id = ?",
      [input.pilgrimUserId],
    );
    if (!pilgrim) throw new Error("زائر یافت نشد");
  }

  const nextPilgrimUserId = input.pilgrimUserId ?? previous.pilgrimUserId;
  const nextStart = input.reservationDate ?? previous.reservationDate;
  const nextEnd = input.reservationEndDate ?? previous.reservationEndDate;
  const nextStatus = input.status ?? previous.status;

  if (ACTIVE_RESERVATION_STATUSES.includes(nextStatus)) {
    await assertNoPilgrimStayOverlap(ownerUserId, {
      pilgrimUserId: nextPilgrimUserId,
      reservationDate: nextStart,
      reservationEndDate: nextEnd,
      excludeReservationId: id,
    });
  }

  await db.runAsync(
    `UPDATE reservations SET
      mawkibId = COALESCE(?, mawkibId),
      pilgrimUserId = COALESCE(?, pilgrimUserId),
      pilgrimMobile = COALESCE(?, pilgrimMobile),
      reservationDate = COALESCE(?, reservationDate),
      reservationEndDate = COALESCE(?, reservationEndDate),
      maleGuestCount = COALESCE(?, maleGuestCount),
      femaleGuestCount = COALESCE(?, femaleGuestCount),
      companions = COALESCE(?, companions),
      description = COALESCE(?, description),
      travelOrigin = COALESCE(?, travelOrigin),
      status = COALESCE(?, status),
      cancellationNote = COALESCE(?, cancellationNote),
      lastStatusUpdatedByUserId = ?,
      lastStatusUpdatedAt = datetime('now')
     WHERE id = ? AND mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [
      input.mawkibId ?? null,
      input.pilgrimUserId ?? null,
      input.pilgrimMobile
        ? formatMobileForLookup(input.pilgrimMobile)
        : null,
      input.reservationDate ?? null,
      input.reservationEndDate ?? null,
      input.maleGuestCount ?? null,
      input.femaleGuestCount ?? null,
      input.companions?.trim() || null,
      input.description?.trim() || null,
      input.travelOrigin?.trim() || null,
      input.status ?? null,
      input.cancellationNote?.trim() || null,
      ownerUserId,
      id,
      ownerUserId,
    ],
  );

  const reservation = await getReservationById(ownerUserId, id);
  if (!reservation) throw new Error("رزرو یافت نشد");

  const mawkibIds = new Set([previous.mawkibId, reservation.mawkibId]);
  for (const mawkibId of mawkibIds) {
    await rebuildMawkibInventory(mawkibId);
  }

  return reservation;
}

export async function deleteReservation(
  ownerUserId: number,
  id: number,
): Promise<void> {
  const previous = await getReservationById(ownerUserId, id);
  if (!previous) throw new Error("رزرو یافت نشد");

  const db = await getDatabase();
  const result = await db.runAsync(
    `DELETE FROM reservations
     WHERE id = ? AND mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [id, ownerUserId],
  );
  if (!result.changes) throw new Error("رزرو یافت نشد");

  if (previous.status === "Confirmed") {
    await applyReservationOccupancy(
      {
        mawkibId: previous.mawkibId,
        reservationDate: previous.reservationDate,
        reservationEndDate: previous.reservationEndDate,
        maleGuestCount: previous.maleGuestCount,
        femaleGuestCount: previous.femaleGuestCount,
      },
      -1,
    );
  }
}

export async function lookupReservation(
  ownerUserId: number,
  query: string,
): Promise<Reservation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDatabase();
  // جستجوی نام در JS؛ SQLite LIKE برای فارسی قابل‌اعتماد نیست
  const rows = await db.getAllAsync<ReservationRow>(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName,
            p.nationalId as pilgrimNationalId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE m.ownerUserId = ?
       AND r.status IN ('Confirmed', 'Completed')
     ORDER BY r.createdAt DESC
     LIMIT 400`,
    [ownerUserId],
  );

  return rows
    .map(mapReservation)
    .filter((row) => reservationRowMatchesQuery(row, trimmed))
    .slice(0, 20);
}
