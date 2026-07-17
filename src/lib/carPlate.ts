export const IRAN_PLATE_LETTERS = [
  "الف",
  "ب",
  "پ",
  "ت",
  "ث",
  "ج",
  "چ",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "ژ",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ک",
  "گ",
  "ل",
  "م",
  "ن",
  "و",
  "ه",
  "ی",
] as const;

export type CarPlateValue = {
  plateTwoDigit: string;
  plateSerial: string;
  plateProvince: string;
};

export type CarPlateProfileFields = CarPlateValue & {
  carPlate: string | null;
};

export function emptyCarPlate(): CarPlateValue {
  return {
    plateTwoDigit: "",
    plateSerial: "",
    plateProvince: "",
  };
}

export function normalizeDigits(value: string, maxLength?: number): string {
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\D/g, "");
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

export function splitPlateSerial(serial: string): {
  letter: string;
  digits: string;
} {
  const trimmed = serial.trim();
  if (!trimmed) {
    return { letter: "", digits: "" };
  }

  const letterMatch = trimmed.match(
    new RegExp(`^(${IRAN_PLATE_LETTERS.join("|")})`),
  );
  if (letterMatch) {
    return {
      letter: letterMatch[1],
      digits: normalizeDigits(trimmed.slice(letterMatch[1].length), 3),
    };
  }

  // No recognized plate letter prefix — keep everything in the digits segment.
  return {
    letter: "",
    digits: normalizeDigits(trimmed, 3),
  };
}

export function combinePlateSerial(letter: string, digits: string): string {
  const normalizedLetter = letter.trim();
  const normalizedDigits = normalizeDigits(digits, 3);
  if (!normalizedLetter && !normalizedDigits) return "";
  return `${normalizedLetter}${normalizedDigits}`;
}

export function normalizeCarPlateValue(value: CarPlateValue): CarPlateValue {
  return {
    plateTwoDigit: normalizeDigits(value.plateTwoDigit, 2),
    plateSerial: value.plateSerial.trim(),
    plateProvince: normalizeDigits(value.plateProvince, 2),
  };
}

export function formatCarPlateDisplay(value: CarPlateValue): string {
  const normalized = normalizeCarPlateValue(value);
  const { letter, digits } = splitPlateSerial(normalized.plateSerial);
  if (
    !normalized.plateTwoDigit &&
    !letter &&
    !digits &&
    !normalized.plateProvince
  ) {
    return "";
  }

  const serialPart = combinePlateSerial(letter, digits);
  return `${normalized.plateTwoDigit}${serialPart ? ` ${serialPart}` : ""}${
    normalized.plateProvince ? ` ایران ${normalized.plateProvince}` : ""
  }`.trim();
}

export function parseCarPlateText(text: string): CarPlateValue {
  const trimmed = text.trim();
  if (!trimmed) return emptyCarPlate();

  const normalized = trimmed
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\s+/g, " ")
    .replace(/[-–—]/g, " ");

  const iranMatch = normalized.match(
    /^(.*?)(?:\s+)?(?:ایران|iran)\s*(\d{1,2})$/i,
  );
  const province = iranMatch?.[2] ?? "";
  const left = (iranMatch?.[1] ?? normalized).trim();

  const compactMatch = left.match(/^(\d{2})([آ-ی])(\d{1,3})$/);
  if (compactMatch) {
    return normalizeCarPlateValue({
      plateTwoDigit: compactMatch[1],
      plateSerial: combinePlateSerial(compactMatch[2], compactMatch[3]),
      plateProvince: province || normalized.match(/(\d{2})$/)?.[1] || "",
    });
  }

  const spacedMatch = left.match(/^(\d{2})\s+([آ-ی])\s*(\d{1,3})$/);
  if (spacedMatch) {
    return normalizeCarPlateValue({
      plateTwoDigit: spacedMatch[1],
      plateSerial: combinePlateSerial(spacedMatch[2], spacedMatch[3]),
      plateProvince: province,
    });
  }

  const digitsOnly = normalizeDigits(left);
  if (digitsOnly.length >= 2) {
    return normalizeCarPlateValue({
      plateTwoDigit: digitsOnly.slice(0, 2),
      plateSerial: left.slice(2).trim(),
      plateProvince: province,
    });
  }

  return emptyCarPlate();
}

export function carPlateFromUser(user: {
  plateTwoDigit?: string | null;
  plateSerial?: string | null;
  plateProvince?: string | null;
  carPlate?: string | null;
}): CarPlateValue {
  if (
    user.plateTwoDigit?.trim() ||
    user.plateSerial?.trim() ||
    user.plateProvince?.trim()
  ) {
    return normalizeCarPlateValue({
      plateTwoDigit: user.plateTwoDigit ?? "",
      plateSerial: user.plateSerial ?? "",
      plateProvince: user.plateProvince ?? "",
    });
  }

  if (user.carPlate?.trim()) {
    return parseCarPlateText(user.carPlate);
  }

  return emptyCarPlate();
}

export function carPlateToProfileFields(
  value: CarPlateValue,
): CarPlateProfileFields {
  const normalized = normalizeCarPlateValue(value);
  const hasAny =
    !!normalized.plateTwoDigit ||
    !!normalized.plateSerial ||
    !!normalized.plateProvince;

  if (!hasAny) {
    return {
      plateTwoDigit: "",
      plateSerial: "",
      plateProvince: "",
      carPlate: null,
    };
  }

  return {
    ...normalized,
    carPlate: formatCarPlateDisplay(normalized) || null,
  };
}

export function resolveProfilePlateFields(input: {
  carPlate?: string | null;
  plateTwoDigit?: string | null;
  plateSerial?: string | null;
  plateProvince?: string | null;
}): CarPlateProfileFields | null {
  const hasStructured =
    input.plateTwoDigit !== undefined ||
    input.plateSerial !== undefined ||
    input.plateProvince !== undefined;

  if (!hasStructured && input.carPlate === undefined) {
    return null;
  }

  if (hasStructured) {
    return carPlateToProfileFields({
      plateTwoDigit: input.plateTwoDigit ?? "",
      plateSerial: input.plateSerial ?? "",
      plateProvince: input.plateProvince ?? "",
    });
  }

  return carPlateToProfileFields(parseCarPlateText(input.carPlate ?? ""));
}

export function isCarPlateComplete(value: CarPlateValue): boolean {
  const normalized = normalizeCarPlateValue(value);
  const { letter, digits } = splitPlateSerial(normalized.plateSerial);
  return (
    normalized.plateTwoDigit.length === 2 &&
    !!letter &&
    IRAN_PLATE_LETTERS.includes(letter as (typeof IRAN_PLATE_LETTERS)[number]) &&
    digits.length === 3 &&
    normalized.plateProvince.length === 2
  );
}

export function isCarPlateEmpty(value: CarPlateValue): boolean {
  const normalized = normalizeCarPlateValue(value);
  return (
    !normalized.plateTwoDigit &&
    !normalized.plateSerial &&
    !normalized.plateProvince
  );
}

export function matchesCarPlate(
  user: {
    plateTwoDigit?: string | null;
    plateSerial?: string | null;
    plateProvince?: string | null;
    carPlate?: string | null;
  },
  search: CarPlateValue,
): boolean {
  const userParts = carPlateFromUser(user);
  const searchParts = normalizeCarPlateValue(search);

  if (isCarPlateEmpty(searchParts)) return false;

  if (isCarPlateComplete(searchParts)) {
    return (
      userParts.plateTwoDigit === searchParts.plateTwoDigit &&
      userParts.plateSerial === searchParts.plateSerial &&
      userParts.plateProvince === searchParts.plateProvince
    );
  }

  if (
    searchParts.plateTwoDigit &&
    !userParts.plateTwoDigit.startsWith(searchParts.plateTwoDigit)
  ) {
    return false;
  }
  if (
    searchParts.plateSerial &&
    !userParts.plateSerial.startsWith(searchParts.plateSerial)
  ) {
    return false;
  }
  if (
    searchParts.plateProvince &&
    !userParts.plateProvince.startsWith(searchParts.plateProvince)
  ) {
    return false;
  }

  const legacyNeedle = formatCarPlateDisplay(searchParts);
  if (legacyNeedle && user.carPlate?.includes(legacyNeedle)) {
    return true;
  }

  return true;
}
