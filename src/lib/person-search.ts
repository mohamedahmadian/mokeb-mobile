import {
  formatMobileForLookup,
  toLatinDigits,
} from "@/src/lib/validation";

/** یکسان‌سازی حروف عربی/فارسی و یونیکد برای جستجوی قابل‌اعتماد نام */
export function normalizePersianText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\u064A/g, "\u06CC") // ي → ی
    .replace(/\u06D2/g, "\u06CC") // ے → ی
    .replace(/\u0649/g, "\u06CC") // ى → ی
    .replace(/\u0643/g, "\u06A9") // ك → ک
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0623|\u0625|\u0622/g, "\u0627") // أ إ آ → ا
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u06CC") // ئ → ی
    .replace(/[\u064B-\u065F\u0670]/g, "") // اعراب
    .replace(/\u200C/g, "") // ZWNJ
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitLookupNameTokens(query: string): string[] {
  return normalizePersianText(query)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export function matchesFullName(
  fullName: string | null | undefined,
  query: string,
): boolean {
  const tokens = splitLookupNameTokens(query);
  if (tokens.length === 0) return false;
  const name = normalizePersianText(fullName ?? "");
  if (!name) return false;
  return tokens.every((token) => name.includes(token));
}

function digitsOnly(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "");
}

export function matchesMobile(
  mobile: string | null | undefined,
  query: string,
): boolean {
  const q = digitsOnly(query);
  if (q.length < 3) return false;
  const stored = digitsOnly(mobile ?? "");
  if (!stored) return false;
  const normalizedQ = formatMobileForLookup(query).replace(/\D/g, "");
  return stored.includes(q) || stored.includes(normalizedQ);
}

export function matchesNationalId(
  nationalId: string | null | undefined,
  query: string,
): boolean {
  const q = digitsOnly(query);
  if (q.length < 3) return false;
  const stored = digitsOnly(nationalId ?? "");
  return !!stored && stored.includes(q);
}

export function matchesTrackingCode(
  trackingCode: string | null | undefined,
  query: string,
): boolean {
  const q = normalizePersianText(toLatinDigits(query)).toLowerCase();
  if (!q) return false;
  const code = normalizePersianText(
    toLatinDigits(trackingCode ?? ""),
  ).toLowerCase();
  return !!code && (code === q || code.includes(q));
}

/** جستجوی ترکیبی: نام / موبایل / کد ملی / کد رزرو */
export function matchesPersonOrReservationQuery(
  query: string,
  fields: {
    fullName?: string | null;
    mobile?: string | null;
    nationalId?: string | null;
    trackingCode?: string | null;
    mawkibName?: string | null;
  },
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;

  return (
    matchesFullName(fields.fullName, trimmed) ||
    matchesMobile(fields.mobile, trimmed) ||
    matchesNationalId(fields.nationalId, trimmed) ||
    matchesTrackingCode(fields.trackingCode, trimmed) ||
    matchesFullName(fields.mawkibName, trimmed)
  );
}

/** آیا عبارت بیشتر شبیه عدد (موبایل/کد) است تا نام؟ */
export function isMostlyDigitsQuery(query: string): boolean {
  const latin = toLatinDigits(query.trim());
  const digits = latin.replace(/\D/g, "");
  const letters = latin.replace(/[\d\s\-_./+()]/g, "");
  return digits.length >= 3 && letters.length === 0;
}
