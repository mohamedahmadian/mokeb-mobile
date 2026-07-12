import {
  isValidJalaaliDate,
  toGregorian,
  toJalaali,
} from "jalaali-js";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toLatinDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);
    return String(ARABIC_DIGITS.indexOf(digit));
  });
}

function toPersianDigits(value: string) {
  return value.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function formatPersianDate(isoDate: string) {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;

  const { jy, jm, jd } = toJalaali(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
  return toPersianDigits(
    `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`,
  );
}

export function parsePersianDate(value: string) {
  const normalized = toLatinDigits(value.trim()).replace(/-/g, "/");
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  if (!isValidJalaaliDate(jy, jm, jd)) return null;

  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function formatPersianDateRange(startDate: string, endDate: string) {
  const start = formatPersianDate(startDate.slice(0, 10));
  const end = formatPersianDate(endDate.slice(0, 10));
  if (start === end) return start;
  return `${start} الی ${end}`;
}

export function formatPersianNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

export function addDaysToPersianDate(value: string, days: number) {
  const isoDate = parsePersianDate(value);
  if (!isoDate) return null;

  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatPersianDate(date.toISOString().slice(0, 10));
}
