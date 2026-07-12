import { Linking, Platform } from "react-native";
import { getGuestBaseUrl } from "@/src/lib/guest-config";
import { formatMobileForSms } from "@/src/lib/mobile";
import type { Mawkib, Reservation } from "@/src/types";

const TRACK_QUERY_PARAM = "trackingCode";

export function buildPilgrimCardUrl(trackingCode: string): string {
  const base = getGuestBaseUrl();
  const params = new URLSearchParams({
    [TRACK_QUERY_PARAM]: trackingCode.trim(),
  });
  if (!base) return `/guest/pilgrim-card?${params.toString()}`;
  return `${base}/guest/pilgrim-card?${params.toString()}`;
}

export function buildReservationSmsBody(input: {
  trackingCode: string;
  pilgrimMobile?: string | null;
  mawkibName?: string | null;
  mawkibAddress?: string | null;
  neshanAddressUrl?: string | null;
}): string {
  const trackingCode = input.trackingCode.trim();
  const mawkibName = input.mawkibName?.trim();
  const address =
    input.mawkibAddress?.trim() || mawkibName || "—";
  const neshanAddress = input.neshanAddressUrl?.trim();
  const cardUrl = buildPilgrimCardUrl(trackingCode);

  const bodyLines = [
    ...(mawkibName ? [mawkibName, ""] : []),
    "کد رزرو:",
    trackingCode,
    "",
    "زائر کارت:",
    cardUrl,
    "",
    "ادرس:",
    address,
  ];

  if (neshanAddress) {
    bodyLines.push("", "نشان:", neshanAddress);
  }

  return bodyLines.join("\n");
}

export function buildReservationSmsUrl(input: {
  trackingCode: string;
  pilgrimMobile: string;
  mawkib?: Pick<Mawkib, "name" | "address" | "neshanAddressUrl"> | null;
  mawkibName?: string | null;
}): string | null {
  const recipient = formatMobileForSms(input.pilgrimMobile);
  if (!recipient) return null;

  const body = buildReservationSmsBody({
    trackingCode: input.trackingCode,
    mawkibName: input.mawkib?.name ?? input.mawkibName,
    mawkibAddress: input.mawkib?.address,
    neshanAddressUrl: input.mawkib?.neshanAddressUrl,
  });

  const bodyParam = Platform.OS === "ios" ? "&body=" : "?body=";
  return `sms:${recipient}${bodyParam}${encodeURIComponent(body)}`;
}

export async function openReservationSms(input: {
  trackingCode: string;
  pilgrimMobile: string;
  mawkib?: Pick<Mawkib, "name" | "address" | "neshanAddressUrl"> | null;
  mawkibName?: string | null;
}): Promise<void> {
  const url = buildReservationSmsUrl(input);
  if (!url) {
    throw new Error("شماره موبایل زائر معتبر نیست");
  }
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error("امکان باز کردن پیامک در این دستگاه وجود ندارد");
  }
  await Linking.openURL(url);
}

export type PilgrimCardDetails = {
  reservation: Reservation;
  mawkibName: string;
  mawkibAddress: string;
  mawkibPhone: string;
  mawkibImageUrl?: string | null;
  mawkibLatitude?: number | null;
  mawkibLongitude?: number | null;
  neshanAddressUrl?: string | null;
  ownerName: string;
  ownerPhone: string;
  pilgrimName: string;
};
