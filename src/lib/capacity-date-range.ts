import {
  addGregorianDays,
  todayDateStringInAppTz,
} from "@/src/lib/date-only";

export const MAWKIB_INVENTORY_HORIZON_DAYS = 90;

export type CapacityDateBounds = {
  minDate: string;
  maxDate: string;
  isServicePeriod: boolean;
};

export type InventoryHorizonMeta = {
  horizonDays: number;
  minDate: string;
  maxDate: string;
};

export function getInventoryHorizonMeta(
  horizonDays = MAWKIB_INVENTORY_HORIZON_DAYS,
): InventoryHorizonMeta {
  const minDate = todayDateStringInAppTz();
  const maxDate = addGregorianDays(minDate, Math.max(1, horizonDays) - 1);
  return { horizonDays, minDate, maxDate };
}

function normalizeDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

/** Effective selectable range: mawkib service period, or inventory horizon fallback. */
export function getCapacityDateBounds(
  serviceStartDate?: string | null,
  serviceEndDate?: string | null,
  fallbackHorizon?: { minDate: string; maxDate: string },
): CapacityDateBounds | null {
  const serviceStart = normalizeDateOnly(serviceStartDate);
  const serviceEnd = normalizeDateOnly(serviceEndDate);

  if (serviceStart && serviceEnd) {
    if (serviceStart > serviceEnd) return null;
    return { minDate: serviceStart, maxDate: serviceEnd, isServicePeriod: true };
  }

  if (fallbackHorizon) {
    return { ...fallbackHorizon, isServicePeriod: false };
  }

  return null;
}

/** Default capacity view: up to 7 days within the allowed bounds. */
export function defaultCapacityRange(bounds?: CapacityDateBounds): {
  startDate: string;
  endDate: string;
} {
  if (!bounds) {
    const startDate = todayDateStringInAppTz();
    return { startDate, endDate: addGregorianDays(startDate, 6) };
  }

  const today = todayDateStringInAppTz();
  let startDate = bounds.minDate;
  if (today > startDate && today <= bounds.maxDate) {
    startDate = today;
  }
  let endDate = addGregorianDays(startDate, 6);
  if (endDate > bounds.maxDate) {
    endDate = bounds.maxDate;
  }
  if (startDate > endDate) {
    startDate = endDate;
  }
  return { startDate, endDate };
}

export function countDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff + 1;
}

export function isRangeWithinBounds(
  startDate: string,
  endDate: string,
  minDate: string,
  maxDate: string,
): boolean {
  return startDate >= minDate && endDate <= maxDate && endDate >= startDate;
}
