const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(ch);
    if (persianIndex >= 0) return String(persianIndex);
    const arabicIndex = ARABIC_DIGITS.indexOf(ch);
    return arabicIndex >= 0 ? String(arabicIndex) : ch;
  });
}

export function normalizeMobileDigits(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "");
}

export function formatMobileForLookup(value: string): string {
  const digits = normalizeMobileDigits(value);
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
}

export function isCompleteIranMobile(value: string): boolean {
  const digits = normalizeMobileDigits(value);
  if (digits.length === 12 && digits.startsWith("98")) {
    return digits.slice(2).length === 10 && digits[2] === "9";
  }
  if (digits.length === 10 && digits.startsWith("9")) return true;
  return digits.length === 11 && digits.startsWith("09");
}

export function getMobileValidationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "شماره موبایل را وارد کنید";
  if (!isCompleteIranMobile(trimmed)) {
    return "شماره موبایل باید ۱۱ رقم باشد (مثلاً 09121234567)";
  }
  return null;
}

export function getNationalIdValidationError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = normalizeMobileDigits(trimmed);
  if (digits.length !== 10) return "کد ملی باید ۱۰ رقم باشد";
  return null;
}

export function getPasswordValidationError(value: string): string | null {
  if (!value) return "رمز عبور را وارد کنید";
  if (value.length < 6) return "رمز عبور باید حداقل ۶ کاراکتر باشد";
  return null;
}

export function getFullNameValidationError(value: string): string | null {
  if (!value.trim()) return "نام و نام خانوادگی را وارد کنید";
  return null;
}
