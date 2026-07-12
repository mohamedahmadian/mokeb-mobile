export type PilgrimCardWeekdayId =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export interface PilgrimCardWeekdayAccent {
  id: PilgrimCardWeekdayId;
  label: string;
  color: string;
  borderColor: string;
  accentColor: string;
  textOnColor: string;
}

const WEEKDAY_ACCENTS: PilgrimCardWeekdayAccent[] = [
  {
    id: "sunday",
    label: "یکشنبه",
    color: "#F2F6FB",
    borderColor: "#CBD9EA",
    accentColor: "#DFEAF7",
    textOnColor: "#45627F",
  },
  {
    id: "monday",
    label: "دوشنبه",
    color: "#F4F6F8",
    borderColor: "#D6DDE5",
    accentColor: "#E6EBF0",
    textOnColor: "#52606F",
  },
  {
    id: "tuesday",
    label: "سه‌شنبه",
    color: "#F0F7F3",
    borderColor: "#C9DED2",
    accentColor: "#DCEDE3",
    textOnColor: "#416856",
  },
  {
    id: "wednesday",
    label: "چهارشنبه",
    color: "#FAF5EF",
    borderColor: "#E5D3C0",
    accentColor: "#F2E5D7",
    textOnColor: "#795E45",
  },
  {
    id: "thursday",
    label: "پنج‌شنبه",
    color: "#F7F3FA",
    borderColor: "#DDD0E7",
    accentColor: "#ECE3F2",
    textOnColor: "#6D587C",
  },
  {
    id: "friday",
    label: "جمعه",
    color: "#FAF2F2",
    borderColor: "#E7CCCC",
    accentColor: "#F3DEDE",
    textOnColor: "#805252",
  },
  {
    id: "saturday",
    label: "شنبه",
    color: "#FAF7EF",
    borderColor: "#E4D8B9",
    accentColor: "#F1E8D3",
    textOnColor: "#756445",
  },
];

export function getPilgrimCardWeekdayAccent(date: Date = new Date()) {
  return WEEKDAY_ACCENTS[date.getDay()];
}

function parseLocalDateOnly(isoDate: string): Date | null {
  const trimmed = isoDate.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function getPilgrimCardWeekdayAccentForStayStart(reservationDate: string) {
  const parsed = parseLocalDateOnly(reservationDate);
  return getPilgrimCardWeekdayAccent(parsed ?? new Date());
}

function getPilgrimCardWeekdayLabelForDate(isoDate: string) {
  const parsed = parseLocalDateOnly(isoDate);
  return getPilgrimCardWeekdayAccent(parsed ?? new Date()).label;
}

export function formatPresenceStayWeekdays(
  reservationDate: string,
  reservationEndDate?: string | null,
) {
  const start = reservationDate.trim().slice(0, 10);
  const end = (reservationEndDate ?? reservationDate).trim().slice(0, 10);
  const startLabel = getPilgrimCardWeekdayLabelForDate(start);
  const endLabel = getPilgrimCardWeekdayLabelForDate(end);
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}
