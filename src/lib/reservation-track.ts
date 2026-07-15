import { Linking, Platform } from "react-native";
import { getGuestBaseUrl } from "@/src/lib/guest-config";
import { formatMobileForSms } from "@/src/lib/mobile";
import type { Mawkib, Reservation, UserGender } from "@/src/types";

const TRACK_QUERY_PARAM = "trackingCode";

export function buildPilgrimCardUrl(trackingCode: string): string {
  const base = getGuestBaseUrl();
  const params = new URLSearchParams({
    [TRACK_QUERY_PARAM]: trackingCode.trim(),
  });
  if (!base) return `/guest/pilgrim-card?${params.toString()}`;
  return `${base}/guest/pilgrim-card?${params.toString()}`;
}

function buildSmsGreeting(input: {
  pilgrimName?: string | null;
  pilgrimGender?: UserGender | null;
  mawkibName?: string | null;
}): string | null {
  const name = input.pilgrimName?.trim();
  const mawkib = input.mawkibName?.trim();
  if (!name || !mawkib) return null;

  if (input.pilgrimGender === "Male") {
    return `آقای ${name} عزیز، به موکب ${mawkib} خوش آمدید`;
  }
  if (input.pilgrimGender === "Female") {
    return `خانم ${name} گرامی، به موکب ${mawkib} خوش آمدید`;
  }
  return `${name} عزیز، به موکب ${mawkib} خوش آمدید`;
}

export function buildReservationSmsBody(input: {
  trackingCode: string;
  pilgrimName?: string | null;
  pilgrimGender?: UserGender | null;
  pilgrimMobile?: string | null;
  mawkibName?: string | null;
  mawkibAddress?: string | null;
  neshanAddressUrl?: string | null;
  ownerPhone?: string | null;
}): string {
  const trackingCode = input.trackingCode.trim();
  const mawkibName = input.mawkibName?.trim();
  const address = input.mawkibAddress?.trim();
  const neshanAddress = input.neshanAddressUrl?.trim();
  const ownerPhone = input.ownerPhone?.trim();
  const greeting = buildSmsGreeting({
    pilgrimName: input.pilgrimName,
    pilgrimGender: input.pilgrimGender,
    mawkibName,
  });

  const bodyLines: string[] = [];

  if (greeting) {
    bodyLines.push(greeting, "");
  } else if (mawkibName) {
    bodyLines.push(mawkibName, "");
  }

  bodyLines.push("کد رزرو:", trackingCode);

  if (address) {
    bodyLines.push("", "آدرس:", address);
  }

  if (neshanAddress) {
    bodyLines.push("", "نشان:", neshanAddress);
  }

  if (ownerPhone) {
    bodyLines.push("", "شماره مسئول موکب:", ownerPhone);
  }

  return bodyLines.join("\n");
}

export function buildReservationSmsUrl(input: {
  trackingCode: string;
  pilgrimMobile: string;
  pilgrimName?: string | null;
  pilgrimGender?: UserGender | null;
  mawkib?: Pick<Mawkib, "name" | "address" | "neshanAddressUrl"> | null;
  mawkibName?: string | null;
  ownerPhone?: string | null;
}): string | null {
  const recipient = formatMobileForSms(input.pilgrimMobile);
  if (!recipient) return null;

  const body = buildReservationSmsBody({
    trackingCode: input.trackingCode,
    pilgrimName: input.pilgrimName,
    pilgrimGender: input.pilgrimGender,
    mawkibName: input.mawkib?.name ?? input.mawkibName,
    mawkibAddress: input.mawkib?.address,
    neshanAddressUrl: input.mawkib?.neshanAddressUrl,
    ownerPhone: input.ownerPhone,
  });

  const bodyParam = Platform.OS === "ios" ? "&body=" : "?body=";
  return `sms:${recipient}${bodyParam}${encodeURIComponent(body)}`;
}

export async function openReservationSms(input: {
  trackingCode: string;
  pilgrimMobile: string;
  pilgrimName?: string | null;
  pilgrimGender?: UserGender | null;
  mawkib?: Pick<Mawkib, "name" | "address" | "neshanAddressUrl"> | null;
  mawkibName?: string | null;
  ownerPhone?: string | null;
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
  pilgrimGender?: UserGender | null;
};
