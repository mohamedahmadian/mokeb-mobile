import type {
  PilgrimFilterFormState,
  PilgrimListFilters,
} from "@/src/types";
import {
  isCarPlateEmpty,
  normalizeCarPlateValue,
  type CarPlateValue,
} from "@/src/lib/carPlate";

export function createEmptyPilgrimFilterForm(): PilgrimFilterFormState {
  return {
    country: "",
    province: "",
    city: "",
    plateTwoDigit: "",
    plateSerial: "",
    plateProvince: "",
    passportNumber: "",
    gender: "",
    description: "",
  };
}

export function pilgrimFilterPlateToValue(
  form: Pick<
    PilgrimFilterFormState,
    "plateTwoDigit" | "plateSerial" | "plateProvince"
  >,
): CarPlateValue {
  return normalizeCarPlateValue({
    plateTwoDigit: form.plateTwoDigit,
    plateSerial: form.plateSerial,
    plateProvince: form.plateProvince,
  });
}

export function pilgrimFilterFormToListFilters(
  form: PilgrimFilterFormState,
): PilgrimListFilters {
  const plate = pilgrimFilterPlateToValue(form);
  const hasPlate = !isCarPlateEmpty(plate);

  return {
    country: form.country.trim() || undefined,
    province: form.province.trim() || undefined,
    city: form.city.trim() || undefined,
    plateTwoDigit: hasPlate ? plate.plateTwoDigit || undefined : undefined,
    plateSerial: hasPlate ? plate.plateSerial || undefined : undefined,
    plateProvince: hasPlate ? plate.plateProvince || undefined : undefined,
    passportNumber: form.passportNumber.trim() || undefined,
    gender: form.gender || undefined,
    description: form.description.trim() || undefined,
  };
}

export function pilgrimListFiltersToForm(
  filters: PilgrimListFilters,
): PilgrimFilterFormState {
  return {
    country: filters.country ?? "",
    province: filters.province ?? "",
    city: filters.city ?? "",
    plateTwoDigit: filters.plateTwoDigit ?? "",
    plateSerial: filters.plateSerial ?? "",
    plateProvince: filters.plateProvince ?? "",
    passportNumber: filters.passportNumber ?? "",
    gender: filters.gender ?? "",
    description: filters.description ?? "",
  };
}

export function hasActivePilgrimFilters(filters: PilgrimListFilters): boolean {
  return !!(
    filters.country?.trim() ||
    filters.province?.trim() ||
    filters.city?.trim() ||
    filters.plateTwoDigit?.trim() ||
    filters.plateSerial?.trim() ||
    filters.plateProvince?.trim() ||
    filters.passportNumber?.trim() ||
    filters.gender ||
    filters.description?.trim()
  );
}

export function setPilgrimFilterPlate(
  form: PilgrimFilterFormState,
  plate: CarPlateValue,
): PilgrimFilterFormState {
  const normalized = normalizeCarPlateValue(plate);
  return {
    ...form,
    plateTwoDigit: normalized.plateTwoDigit,
    plateSerial: normalized.plateSerial,
    plateProvince: normalized.plateProvince,
  };
}

export function getPilgrimFilterPlate(
  form: PilgrimFilterFormState,
): CarPlateValue {
  return pilgrimFilterPlateToValue(form);
}
