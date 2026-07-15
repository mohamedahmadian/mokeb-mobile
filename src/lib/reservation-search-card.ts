import type { ViewStyle } from "react-native";
import type { Ionicons } from "@expo/vector-icons";
import { reservationStatusLabel } from "@/src/lib/labels";
import { formatPersianDate } from "@/src/lib/persianDate";
import { colors } from "@/src/lib/theme";
import type { Reservation } from "@/src/types";

type ReservationSearchCardDetail = {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  value?: string;
  text?: string;
};

export function getReservationSearchCardDetails(
  reservation: Reservation,
): ReservationSearchCardDetail[] {
  return [
    {
      icon: "barcode-outline",
      label: "شناسه رزرو",
      value: reservation.trackingCode,
    },
    {
      icon: "call-outline",
      label: "موبایل",
      value: reservation.pilgrimMobile,
    },
    ...(reservation.pilgrimNationalId
      ? [
          {
            icon: "id-card-outline" as const,
            label: "کد ملی",
            value: reservation.pilgrimNationalId,
          },
        ]
      : []),
    {
      icon: "home-outline",
      label: "موکب",
      value: reservation.mawkibName ?? "نامشخص",
    },
    {
      icon: "calendar-outline",
      label: "تاریخ اقامت",
      value: `${formatPersianDate(reservation.reservationDate)} تا ${formatPersianDate(reservation.reservationEndDate)}`,
    },
    {
      icon: "information-circle-outline",
      label: "وضعیت رزرو",
      value: reservationStatusLabel[reservation.status],
    },
  ];
}

export function getReservationSearchCardStyle(
  status: Reservation["status"],
): ViewStyle | undefined {
  if (status === "Confirmed") {
    return {
      borderColor: "#86efac",
      borderWidth: 1.5,
      shadowColor: colors.success,
      shadowOpacity: 0.07,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    };
  }

  if (status === "Cancelled") {
    return {
      borderColor: "#fecdd3",
      borderWidth: 1.5,
      shadowColor: "#fb7185",
      shadowOpacity: 0.07,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    };
  }

  return undefined;
}
