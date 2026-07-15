export {
  normalizePersianText,
  splitLookupNameTokens,
  matchesFullName,
  matchesMobile,
  matchesNationalId,
  matchesTrackingCode,
  matchesPersonOrReservationQuery,
  isMostlyDigitsQuery,
} from "@/src/lib/person-search";

import { formatMobileForLookup } from "@/src/lib/validation";
import {
  matchesFullName,
  matchesMobile,
  matchesNationalId,
  matchesTrackingCode,
  splitLookupNameTokens,
} from "@/src/lib/person-search";

/**
 * @deprecated ترجیح با matchesPersonOrReservationQuery در JS
 * باقی مانده برای سازگاری؛ جستجوی نام در SQL دیگر قابل‌اعتماد نیست.
 */
export function buildFullNameSearchClause(
  query: string,
  column = "p.fullName",
): { clause: string; params: string[] } {
  const tokens = splitLookupNameTokens(query);
  if (tokens.length === 0) {
    return { clause: "1 = 0", params: [] };
  }
  // INSTR برای یونیکد پایدارتر از LIKE است
  return {
    clause: tokens
      .map(() => `instr(lower(${column}), lower(?)) > 0`)
      .join(" AND "),
    params: tokens,
  };
}

export function buildReservationLookupFilter(query: string): {
  clause: string;
  params: string[];
} {
  const trimmed = query.trim();
  const mobile = formatMobileForLookup(trimmed);
  const like = `%${trimmed}%`;
  const mobileLike = `%${mobile}%`;

  return {
    clause: `(
      r.trackingCode = ? OR r.trackingCode LIKE ? OR
      r.pilgrimMobile LIKE ? OR p.mobileNumber LIKE ? OR
      p.nationalId = ? OR p.nationalId LIKE ?
    )`,
    params: [trimmed, like, mobileLike, mobileLike, trimmed, like],
  };
}

export function reservationRowMatchesQuery(
  row: {
    trackingCode?: string | null;
    pilgrimMobile?: string | null;
    pilgrimName?: string | null;
    pilgrimNationalId?: string | null;
    mawkibName?: string | null;
  },
  query: string,
): boolean {
  return (
    matchesTrackingCode(row.trackingCode, query) ||
    matchesMobile(row.pilgrimMobile, query) ||
    matchesFullName(row.pilgrimName, query) ||
    matchesNationalId(row.pilgrimNationalId, query) ||
    matchesFullName(row.mawkibName, query)
  );
}
