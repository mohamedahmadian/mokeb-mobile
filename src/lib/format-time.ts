import { formatPersianDate } from "@/src/lib/persianDate";

export function formatTimeFromIso(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** تاریخ فارسی + ساعت — مثل ۱۴۰۴/۰۴/۲۱ - ۱۴:۳۰ */
export function formatPersianDateTime(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const localIsoDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const datePart = formatPersianDate(localIsoDate);
  const timePart = formatTimeFromIso(iso);
  if (!datePart) return timePart;
  if (!timePart) return datePart;
  return `${datePart} - ${timePart}`;
}
