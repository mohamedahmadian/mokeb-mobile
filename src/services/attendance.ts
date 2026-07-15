import { getDatabase } from "@/src/db/client";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { reservationRowMatchesQuery } from "@/src/lib/reservation-lookup";
import { reservationOccupiesDay } from "@/src/lib/reservation-occupancy";
import type {
  Reservation,
  ReservationEvent,
  ReservationEventType,
  ReservationPresenceState,
} from "@/src/types";
import { listPendingDeliveredItemsByReservation } from "./delivered-items";
import { getReservationById } from "./reservations";



function assertEventAllowed(

  eventType: ReservationEventType,

  presence: ReservationPresenceState,

  reservation: Reservation,

) {

  if (reservation.status === "Cancelled" || reservation.status === "Pending") {

    throw new Error("ثبت حضور برای این رزرو مجاز نیست");

  }



  if (reservation.status === "Completed" && eventType !== "EARLY_CHECKOUT") {

    throw new Error("رزرو تکمیل‌شده است");

  }



  switch (eventType) {

    case "CHECK_IN":

      if (reservation.actualCheckInAt || presence !== "NOT_ARRIVED") {

        throw new Error("ورود اولیه قبلاً ثبت شده است");

      }

      break;

    case "TEMP_OUT":

      if (presence !== "PRESENT") {

        throw new Error("در حال حاضر امکان ثبت خروج موقت نیست");

      }

      break;

    case "TEMP_IN":

      if (presence !== "TEMPORARILY_OUT") {

        throw new Error("در حال حاضر امکان ثبت ورود موقت نیست");

      }

      break;

    case "EARLY_CHECKOUT":

      if (!reservation.actualCheckInAt && presence === "NOT_ARRIVED") {

        throw new Error("ابتدا باید ورود ثبت شود");

      }

      if (presence === "LEFT" || reservation.actualCheckOutAt) {

        throw new Error("خروج نهایی قبلاً ثبت شده است");

      }

      if (reservation.status === "Completed") {

        throw new Error("رزرو تکمیل‌شده است");

      }

      break;

    default:

      break;

  }

}



function nextPresenceState(

  eventType: ReservationEventType,

  current: ReservationPresenceState,

): ReservationPresenceState {

  switch (eventType) {

    case "CHECK_IN":

      return "PRESENT";

    case "TEMP_OUT":

      return "TEMPORARILY_OUT";

    case "TEMP_IN":

      return "PRESENT";

    case "EARLY_CHECKOUT":

      return "LEFT";

    default:

      return current;

  }

}



export async function recordAttendanceEvent(

  ownerUserId: number,

  reservationId: number,

  eventType: ReservationEventType,

  description?: string,

): Promise<Reservation> {

  const reservation = await getReservationById(ownerUserId, reservationId);

  if (!reservation) throw new Error("رزرو یافت نشد");

  if (reservation.status !== "Confirmed" && reservation.status !== "Completed") {

    throw new Error("فقط رزروهای تایید شده قابل ثبت حضور هستند");

  }



  assertEventAllowed(eventType, reservation.presenceState, reservation);

  if (eventType === "EARLY_CHECKOUT") {
    const pendingItems = await listPendingDeliveredItemsByReservation(
      ownerUserId,
      reservationId,
    );
    if (pendingItems.length > 0) {
      throw new Error(
        "قبل از خروج نهایی، وضعیت امانت‌های تحویل‌داده‌شده را مشخص کنید",
      );
    }
  }

  const presenceState = nextPresenceState(

    eventType,

    reservation.presenceState,

  );

  const now = new Date().toISOString();

  const db = await getDatabase();



  await db.runAsync(

    `INSERT INTO reservation_events (reservationId, eventType, createdByUserId, description, createdAt)

     VALUES (?, ?, ?, ?, ?)`,

    [reservationId, eventType, ownerUserId, description?.trim() || null, now],

  );



  const actualCheckInAt =

    eventType === "CHECK_IN" ? now : (reservation.actualCheckInAt ?? null);

  const isFinalCheckout = eventType === "EARLY_CHECKOUT";

  const actualCheckOutAt = isFinalCheckout

    ? now

    : (reservation.actualCheckOutAt ?? null);

  const status = isFinalCheckout ? "Completed" : reservation.status;



  await db.runAsync(

    `UPDATE reservations SET

      presenceState = ?,

      actualCheckInAt = COALESCE(?, actualCheckInAt),

      actualCheckOutAt = COALESCE(?, actualCheckOutAt),

      status = ?,

      lastStatusUpdatedByUserId = ?,

      lastStatusUpdatedAt = ?

     WHERE id = ?`,

    [

      presenceState,

      actualCheckInAt,

      actualCheckOutAt,

      status,

      ownerUserId,

      now,

      reservationId,

    ],

  );



  const updated = await getReservationById(ownerUserId, reservationId);

  if (!updated) throw new Error("خطا در ثبت رویداد");

  return updated;

}



export async function listAttendanceEvents(

  ownerUserId: number,

  reservationId: number,

): Promise<ReservationEvent[]> {

  const db = await getDatabase();

  const rows = await db.getAllAsync<ReservationEvent>(

    `SELECT e.*

     FROM reservation_events e

     INNER JOIN reservations r ON r.id = e.reservationId

     INNER JOIN mawkibs m ON m.id = r.mawkibId

     WHERE e.reservationId = ? AND m.ownerUserId = ?

     ORDER BY e.createdAt ASC`,

    [reservationId, ownerUserId],

  );

  return rows;

}



export async function listPresentReservations(
  ownerUserId: number,
  filters: { mawkibId?: number; query?: string } = {},
): Promise<Reservation[]> {
  const db = await getDatabase();
  const clauses = [
    "m.ownerUserId = ?",
    "r.status = 'Confirmed'",
    "r.presenceState = 'PRESENT'",
  ];
  const params: (string | number)[] = [ownerUserId];

  if (filters.mawkibId) {
    clauses.push("r.mawkibId = ?");
    params.push(filters.mawkibId);
  }

  const rows = await db.getAllAsync<
    Reservation & {
      mawkibName: string;
      pilgrimName: string;
      pilgrimNationalId?: string | null;
    }
  >(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName,
            p.nationalId as pilgrimNationalId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE ${clauses.join(" AND ")}
     ORDER BY r.actualCheckInAt DESC`,
    params,
  );

  if (!filters.query?.trim()) return rows;
  return rows.filter((row) =>
    reservationRowMatchesQuery(
      {
        trackingCode: row.trackingCode,
        pilgrimMobile: row.pilgrimMobile,
        pilgrimName: row.pilgrimName,
        pilgrimNationalId: row.pilgrimNationalId,
        mawkibName: row.mawkibName,
      },
      filters.query!,
    ),
  );
}

export async function listAbsentReservations(
  ownerUserId: number,
  filters: { mawkibId?: number; query?: string } = {},
): Promise<Reservation[]> {
  const db = await getDatabase();
  const clauses = [
    "m.ownerUserId = ?",
    "r.status = 'Confirmed'",
    "r.presenceState IN ('NOT_ARRIVED', 'TEMPORARILY_OUT')",
  ];
  const params: (string | number)[] = [ownerUserId];

  if (filters.mawkibId) {
    clauses.push("r.mawkibId = ?");
    params.push(filters.mawkibId);
  }

  const rows = await db.getAllAsync<
    Reservation & {
      mawkibName: string;
      pilgrimName: string;
      pilgrimNationalId?: string | null;
    }
  >(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName,
            p.nationalId as pilgrimNationalId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE ${clauses.join(" AND ")}
     ORDER BY
       CASE r.presenceState WHEN 'TEMPORARILY_OUT' THEN 0 ELSE 1 END,
       r.createdAt DESC`,
    params,
  );

  if (!filters.query?.trim()) return rows;
  return rows.filter((row) =>
    reservationRowMatchesQuery(
      {
        trackingCode: row.trackingCode,
        pilgrimMobile: row.pilgrimMobile,
        pilgrimName: row.pilgrimName,
        pilgrimNationalId: row.pilgrimNationalId,
        mawkibName: row.mawkibName,
      },
      filters.query!,
    ),
  );
}

export type AttendanceActionVisibility = {
  canInitialCheckIn: boolean;
  canTempIn: boolean;
  canTempOut: boolean;
  canFinalCheckout: boolean;
};

export function getAttendanceActionVisibility(
  reservation: Reservation,
): AttendanceActionVisibility {
  const presence = reservation.presenceState;
  const isActive =
    reservation.status === "Confirmed" || reservation.status === "Completed";

  return {
    canInitialCheckIn:
      isActive &&
      presence === "NOT_ARRIVED" &&
      !reservation.actualCheckInAt,
    canTempOut: isActive && presence === "PRESENT",
    canTempIn: isActive && presence === "TEMPORARILY_OUT",
    canFinalCheckout:
      isActive &&
      !!reservation.actualCheckInAt &&
      !reservation.actualCheckOutAt &&
      (presence === "PRESENT" || presence === "TEMPORARILY_OUT"),
  };
}

export type BulkAttendanceAction = "check_in" | "check_out";

export type BulkAttendanceResult = {
  processed: number;
  skipped: number;
};

function bulkAttendanceEventType(
  reservation: Reservation,
  action: BulkAttendanceAction,
): ReservationEventType | null {
  const visibility = getAttendanceActionVisibility(reservation);

  if (action === "check_in") {
    if (visibility.canInitialCheckIn) return "CHECK_IN";
    if (visibility.canTempIn) return "TEMP_IN";
    return null;
  }

  if (visibility.canTempOut) return "TEMP_OUT";
  return null;
}

export function countBulkAttendanceEligible(
  reservations: Reservation[],
  action: BulkAttendanceAction,
): number {
  return reservations.filter(
    (reservation) => bulkAttendanceEventType(reservation, action) != null,
  ).length;
}

export async function listTodayOccupyingActiveReservations(
  ownerUserId: number,
  mawkibId: number,
): Promise<Reservation[]> {
  const db = await getDatabase();
  const today = todayDateStringInAppTz();

  const rows = await db.getAllAsync<
    Reservation & {
      mawkibName: string;
      pilgrimName: string;
      pilgrimNationalId?: string | null;
    }
  >(
    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName,
            p.nationalId as pilgrimNationalId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     WHERE m.ownerUserId = ?
       AND r.mawkibId = ?
       AND r.status = 'Confirmed'
     ORDER BY r.createdAt DESC`,
    [ownerUserId, mawkibId],
  );

  return rows.filter((row) =>
    reservationOccupiesDay(
      {
        reservationDate: row.reservationDate,
        reservationEndDate: row.reservationEndDate,
      },
      today,
    ),
  );
}

export async function recordBulkAttendance(
  ownerUserId: number,
  mawkibId: number,
  action: BulkAttendanceAction,
): Promise<BulkAttendanceResult> {
  const reservations = await listTodayOccupyingActiveReservations(
    ownerUserId,
    mawkibId,
  );

  let processed = 0;
  let skipped = 0;

  for (const reservation of reservations) {
    const eventType = bulkAttendanceEventType(reservation, action);
    if (!eventType) {
      skipped += 1;
      continue;
    }

    try {
      await recordAttendanceEvent(ownerUserId, reservation.id, eventType);
      processed += 1;
    } catch {
      skipped += 1;
    }
  }

  return { processed, skipped };
}

