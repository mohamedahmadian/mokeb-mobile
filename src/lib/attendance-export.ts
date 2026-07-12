import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { formatTimeFromIso } from "@/src/lib/format-time";
import { presenceStateLabel } from "@/src/lib/labels";
import { formatPersianDate } from "@/src/lib/persianDate";
import type { Reservation } from "@/src/types";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function exportAttendanceToExcel(
  reservations: Reservation[],
  listType: "present" | "absent",
) {
  if (!reservations.length) {
    throw new Error("اطلاعاتی برای دانلود وجود ندارد");
  }

  const rows = [
    [
      "نام زائر",
      "شماره موبایل",
      "کد ملی",
      "شناسه رزرو",
      "موکب",
      "تاریخ شروع",
      "تاریخ پایان",
      "وضعیت حضور",
      "زمان ورود",
      "زمان خروج",
    ],
    ...reservations.map((reservation) => [
      reservation.pilgrimName ?? "زائر",
      reservation.pilgrimMobile,
      reservation.pilgrimNationalId ?? "",
      reservation.trackingCode,
      reservation.mawkibName ?? "نامشخص",
      formatPersianDate(reservation.reservationDate),
      formatPersianDate(reservation.reservationEndDate),
      presenceStateLabel[reservation.presenceState],
      formatTimeFromIso(reservation.actualCheckInAt) || "",
      formatTimeFromIso(reservation.actualCheckOutAt) || "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
  ];
  (worksheet as XLSX.WorkSheet & {
    "!views"?: { rightToLeft: boolean }[];
  })["!views"] = [{ rightToLeft: true }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    listType === "present" ? "حاضرین" : "غائبین",
  );

  const content = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error("فضای ذخیره‌سازی در دسترس نیست");

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${listType}-attendance-${date}.xlsx`;
  const fileUri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("ذخیره فایل در این دستگاه پشتیبانی نمی‌شود");
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: XLSX_MIME,
    dialogTitle: "ذخیره فایل اکسل",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
