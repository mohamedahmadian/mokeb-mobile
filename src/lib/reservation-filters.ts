import { formatPersianDate, parsePersianDate } from "@/src/lib/persianDate";
import type {
  ReservationFilterFormState,
  ReservationListFilters,
} from "@/src/types";

export function createEmptyReservationFilterForm(): ReservationFilterFormState {
  return {
    pilgrimName: "",
    trackingCode: "",
    createdAtDate: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

export function reservationFilterFormToListFilters(
  form: ReservationFilterFormState,
): ReservationListFilters {
  return {
    pilgrimName: form.pilgrimName.trim() || undefined,
    trackingCode: form.trackingCode.trim() || undefined,
    createdAt: form.createdAtDate.trim()
      ? (parsePersianDate(form.createdAtDate.trim()) ?? undefined)
      : undefined,
    reservationDate: form.startDate.trim()
      ? (parsePersianDate(form.startDate.trim()) ?? undefined)
      : undefined,
    reservationEndDate: form.endDate.trim()
      ? (parsePersianDate(form.endDate.trim()) ?? undefined)
      : undefined,
    description: form.description.trim() || undefined,
  };
}

export function reservationListFiltersToForm(
  filters: ReservationListFilters,
): ReservationFilterFormState {
  return {
    pilgrimName: filters.pilgrimName ?? "",
    trackingCode: filters.trackingCode ?? "",
    createdAtDate: filters.createdAt
      ? formatPersianDate(filters.createdAt)
      : "",
    startDate: filters.reservationDate
      ? formatPersianDate(filters.reservationDate)
      : "",
    endDate: filters.reservationEndDate
      ? formatPersianDate(filters.reservationEndDate)
      : "",
    description: filters.description ?? "",
  };
}

export function hasActiveReservationFilters(
  filters: ReservationListFilters,
): boolean {
  return !!(
    filters.pilgrimName?.trim() ||
    filters.trackingCode?.trim() ||
    filters.createdAt?.trim() ||
    filters.reservationDate?.trim() ||
    filters.reservationEndDate?.trim() ||
    filters.description?.trim()
  );
}
