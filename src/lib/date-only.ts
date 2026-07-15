/** UTC date-only helpers — aligned with backend `common/utils/date.util`. */

export const APP_TIMEZONE = "Asia/Tehran";

export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnlyInAppTz(
  date: Date = new Date(),
  timeZone = APP_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayDateStringInAppTz(timeZone = APP_TIMEZONE): string {
  return formatDateOnlyInAppTz(new Date(), timeZone);
}

export function addDays(date: Date | string, days: number): Date {
  const result = parseDateOnly(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addGregorianDays(dateStr: string, days: number): string {
  return formatDateOnly(addDays(dateStr, days));
}

export function eachDateInRange(start: Date | string, end: Date | string): Date[] {
  const dates: Date[] = [];
  const cur = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  while (cur <= endDate) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return dates;
}

export function eachOccupancyDayInStay(
  startDate: Date | string,
  endDate: Date | string,
): Date[] {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (end < start) return [];
  if (start.getTime() === end.getTime()) return [];
  return eachDateInRange(start, addDays(end, -1));
}

export function reservationStayDayCount(
  startDate: Date | string,
  endDate: Date | string,
): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
