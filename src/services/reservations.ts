import { generateTrackingCode, getDatabase } from "@/src/db/client";
import { formatMobileForLookup } from "@/src/lib/validation";
import type { PilgrimCardDetails } from "@/src/lib/reservation-track";
import type {
  Reservation,
  ReservationListFilters,
  ReservationStatus,
} from "@/src/types";

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
    clauses.push(
      `(r.trackingCode LIKE ? OR r.pilgrimMobile LIKE ? OR p.fullName LIKE ? OR p.nationalId LIKE ? OR m.name LIKE ?)`,
    );
    const q = `%${filters.query.trim()}%`;
    params.push(q, q, q, q, q);
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
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE ${clauses.join(" AND ")}
     ORDER BY r.createdAt DESC`,
    params,
  );

  return rows.map(mapReservation);
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
    status?: ReservationStatus;
  },
): Promise<Reservation> {
  if (input.maleGuestCount < 0 || input.femaleGuestCount < 0) {
    throw new Error("تعداد مهمان نمی‌تواند منفی باشد");
  }
  if (input.maleGuestCount + input.femaleGuestCount <= 0) {
    throw new Error("حداقل یک مهمان لازم است");
  }

  const db = await getDatabase();
  const mawkib = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM mawkibs WHERE id = ? AND ownerUserId = ?",
    [input.mawkibId, ownerUserId],
  );
  if (!mawkib) throw new Error("موکب یافت نشد");

  const pilgrim = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE id = ?",
    [input.pilgrimUserId],
  );
  if (!pilgrim) throw new Error("زائر یافت نشد");

  const trackingCode = generateTrackingCode();
  const mobile = formatMobileForLookup(input.pilgrimMobile);
  const status = input.status ?? "Confirmed";

  const result = await db.runAsync(
    `INSERT INTO reservations (
      mawkibId, pilgrimUserId, reservedByUserId,
      reservationDate, reservationEndDate,
      maleGuestCount, femaleGuestCount,
      trackingCode, pilgrimMobile,
      companions, description, travelOrigin,
      status, lastStatusUpdatedByUserId, lastStatusUpdatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      input.mawkibId,
      input.pilgrimUserId,
      ownerUserId,
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
      ownerUserId,
    ],
  );

  const reservation = await getReservationById(ownerUserId, result.lastInsertRowId);
  if (!reservation) throw new Error("خطا در ثبت رزرو");
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
  return reservation;
}

export async function deleteReservation(
  ownerUserId: number,
  id: number,
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `DELETE FROM reservations
     WHERE id = ? AND mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [id, ownerUserId],
  );
  if (!result.changes) throw new Error("رزرو یافت نشد");
}

export async function lookupReservation(
  ownerUserId: number,
  query: string,
): Promise<Reservation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDatabase();
  const mobile = formatMobileForLookup(trimmed);
  const rows = await db.getAllAsync<ReservationRow>(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName, p.nationalId as pilgrimNationalId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE m.ownerUserId = ?
       AND r.status IN ('Confirmed', 'Completed')
       AND (
         r.trackingCode = ?
         OR r.pilgrimMobile LIKE ?
         OR p.nationalId = ?
         OR p.mobileNumber LIKE ?
       )
     ORDER BY r.createdAt DESC
     LIMIT 20`,
    [ownerUserId, trimmed, `%${mobile}%`, trimmed, `%${mobile}%`],
  );

  return rows.map(mapReservation);
}
