import { getDatabase } from "@/src/db/client";

import type {

  Reservation,

  ReservationEvent,

  ReservationEventType,

  ReservationPresenceState,

} from "@/src/types";

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

  if (filters.query) {

    clauses.push(

      "(r.trackingCode LIKE ? OR p.fullName LIKE ? OR r.pilgrimMobile LIKE ? OR p.nationalId LIKE ?)",

    );

    const q = `%${filters.query.trim()}%`;

    params.push(q, q, q, q);

  }



  const rows = await db.getAllAsync<Reservation & { mawkibName: string; pilgrimName: string }>(

    `SELECT r.*, m.name as mawkibName, p.fullName as pilgrimName,
            p.nationalId as pilgrimNationalId

     FROM reservations r

     INNER JOIN mawkibs m ON m.id = r.mawkibId

     INNER JOIN users p ON p.id = r.pilgrimUserId

     WHERE ${clauses.join(" AND ")}

     ORDER BY r.actualCheckInAt DESC`,

    params,

  );



  return rows;

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

  if (filters.query) {
    clauses.push(
      "(r.trackingCode LIKE ? OR p.fullName LIKE ? OR r.pilgrimMobile LIKE ? OR p.nationalId LIKE ?)",
    );
    const q = `%${filters.query.trim()}%`;
    params.push(q, q, q, q);
  }

  return db.getAllAsync<Reservation>(
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

      !reservation.actualCheckOutAt &&

      (presence === "PRESENT" || presence === "TEMPORARILY_OUT"),

  };

}


