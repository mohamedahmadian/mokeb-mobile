import { normalizeMobileDigits } from "@/src/lib/validation";

export function formatMobileForSms(value: string): string | null {
  let digits = normalizeMobileDigits(value);
  if (!digits) return null;

  if (digits.length === 12 && digits.startsWith("98")) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("09")) {
    return digits;
  }

  return null;
}
