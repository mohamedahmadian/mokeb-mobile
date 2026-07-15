import {
  addDays,
  eachOccupancyDayInStay,
  formatDateOnly,
  parseDateOnly,
} from "@/src/lib/date-only";

/** Nights from check-in through day before checkout — matches backend. */
export function reservationOccupiedDays(reservation: {
  reservationDate: string;
  reservationEndDate: string;
}): string[] {
  return eachOccupancyDayInStay(
    reservation.reservationDate,
    reservation.reservationEndDate,
  ).map((day) => formatDateOnly(day));
}

export function reservationOccupiesDay(
  reservation: {
    reservationDate: string;
    reservationEndDate: string;
  },
  day: string,
): boolean {
  const start = parseDateOnly(reservation.reservationDate);
  const end = parseDateOnly(reservation.reservationEndDate);
  const d = parseDateOnly(day);

  if (end < start) return false;
  if (start.getTime() === end.getTime()) return false;
  if (d < start || d >= end) return false;
  return true;
}

export function occupancyDaysDeltaOnEndDateChange(
  reservationDate: string,
  previousEndDate: string,
  newEndDate: string,
): { released: string[]; occupied: string[] } {
  const previousDays = new Set(
    eachOccupancyDayInStay(reservationDate, previousEndDate).map((day) =>
      formatDateOnly(day),
    ),
  );
  const newDays = new Set(
    eachOccupancyDayInStay(reservationDate, newEndDate).map((day) =>
      formatDateOnly(day),
    ),
  );

  const released: string[] = [];
  const occupied: string[] = [];

  for (const key of previousDays) {
    if (!newDays.has(key)) released.push(key);
  }
  for (const key of newDays) {
    if (!previousDays.has(key)) occupied.push(key);
  }

  return { released, occupied };
}

export function lastPlannedOccupiedDay(
  reservationDate: string,
  reservationEndDate: string,
): string {
  const start = parseDateOnly(reservationDate);
  const end = parseDateOnly(reservationEndDate);
  if (end <= start) {
    return formatDateOnly(end < start ? start : addDays(start, -1));
  }
  return formatDateOnly(addDays(end, -1));
}
