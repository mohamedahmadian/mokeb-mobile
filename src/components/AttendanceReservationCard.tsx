import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AttendanceEventTimeline } from "@/src/components/AttendanceEventTimeline";
import { ListCard, PrimaryButton } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { formatTimeFromIso } from "@/src/lib/format-time";
import {
  presenceStateLabel,
  reservationStatusLabel,
} from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { formatPersianDate } from "@/src/lib/persianDate";
import { colors, spacing } from "@/src/lib/theme";
import {
  getAttendanceActionVisibility,
  listAttendanceEvents,
} from "@/src/services/attendance";
import type { Reservation, ReservationEventType } from "@/src/types";

type AttendanceReservationCardProps = {
  reservation: Reservation;
  loadingAction?: ReservationEventType | null;
  onAction: (
    reservationId: number,
    eventType: ReservationEventType,
  ) => void;
  onReservationChange?: (reservation: Reservation) => void;
};

function presenceBadgeColor(presence: Reservation["presenceState"]) {
  switch (presence) {
    case "PRESENT":
      return { bg: colors.successLight, text: colors.success };
    case "TEMPORARILY_OUT":
      return { bg: colors.warningLight, text: colors.warning };
    case "LEFT":
      return { bg: colors.dangerLight, text: colors.danger };
    default:
      return { bg: colors.primaryLight, text: colors.primaryDark };
  }
}

export function AttendanceReservationCard({
  reservation,
  loadingAction = null,
  onAction,
}: AttendanceReservationCardProps) {
  const { user } = useAuth();
  const visibility = getAttendanceActionVisibility(reservation);
  const presenceColors = presenceBadgeColor(reservation.presenceState);

  const eventsQuery = useQuery({
    queryKey: ["attendance-events", user?.id, reservation.id],
    enabled: !!user,
    queryFn: () => listAttendanceEvents(user!.id, reservation.id),
  });

  const handleFinalCheckout = () => {
    notify(
      "خروج نهایی",
      `آیا از ثبت خروج نهایی «${reservation.pilgrimName ?? "زائر"}» مطمئن هستید؟ پس از خروج نهایی، رزرو تکمیل می‌شود.`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "خروج نهایی",
          style: "destructive",
          onPress: () => onAction(reservation.id, "EARLY_CHECKOUT"),
        },
      ],
    );
  };

  const guestSummary = `${reservation.maleGuestCount.toLocaleString("fa-IR")} مرد${
    reservation.femaleGuestCount > 0
      ? ` • ${reservation.femaleGuestCount.toLocaleString("fa-IR")} زن`
      : ""
  }`;

  return (
    <View style={styles.wrap}>
      <ListCard
        title={reservation.pilgrimName ?? "زائر"}
        titleIcon="person-outline"
        badge={presenceStateLabel[reservation.presenceState]}
        badgeColor={presenceColors.bg}
        badgeTextColor={presenceColors.text}
        details={[
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
            icon: "people-outline",
            label: "تعداد",
            value: guestSummary,
          },
          {
            icon: "log-in-outline",
            label: reservation.actualCheckInAt ? "ورود واقعی" : "ساعت ورود",
            value: reservation.actualCheckInAt
              ? formatTimeFromIso(reservation.actualCheckInAt)
              : "ثبت نشده",
          },
          {
            icon: "log-out-outline",
            label: reservation.actualCheckOutAt ? "خروج واقعی" : "ساعت خروج",
            value: reservation.actualCheckOutAt
              ? formatTimeFromIso(reservation.actualCheckOutAt)
              : "ثبت نشده",
          },
          {
            icon: "information-circle-outline",
            label: "وضعیت رزرو",
            value: reservationStatusLabel[reservation.status],
          },
        ]}
        footer={
          <View style={styles.actions}>
            <View style={styles.leftSide}>
              {visibility.canFinalCheckout ? (
                <PrimaryButton
                  label="خروج نهایی"
                  icon="exit-outline"
                  variant="danger"
                  compact
                  loading={loadingAction === "EARLY_CHECKOUT"}
                  style={styles.finalCheckoutButton}
                  labelStyle={styles.actionLabel}
                  onPress={handleFinalCheckout}
                />
              ) : null}
            </View>

            <View style={styles.rightSide}>
              {visibility.canInitialCheckIn ? (
                <PrimaryButton
                  label="ثبت ورود اولیه"
                  icon="log-in-outline"
                  compact
                  loading={loadingAction === "CHECK_IN"}
                  style={styles.rightActionButton}
                  labelStyle={styles.actionLabel}
                  onPress={() => onAction(reservation.id, "CHECK_IN")}
                />
              ) : null}
              {visibility.canTempIn ? (
                <PrimaryButton
                  label="ثبت ورود"
                  icon="log-in-outline"
                  variant="secondary"
                  compact
                  loading={loadingAction === "TEMP_IN"}
                  style={styles.rightActionButton}
                  labelStyle={styles.actionLabel}
                  onPress={() => onAction(reservation.id, "TEMP_IN")}
                />
              ) : null}
              {visibility.canTempOut ? (
                <PrimaryButton
                  label="خروج موقت"
                  icon="log-out-outline"
                  variant="secondary"
                  compact
                  loading={loadingAction === "TEMP_OUT"}
                  style={styles.rightActionButton}
                  labelStyle={styles.actionLabel}
                  onPress={() => onAction(reservation.id, "TEMP_OUT")}
                />
              ) : null}
            </View>
          </View>
        }
      />

      <AttendanceEventTimeline
        events={eventsQuery.data ?? []}
        loading={eventsQuery.isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  actions: {
    direction: "ltr",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  leftSide: {
    flexShrink: 0,
  },
  rightSide: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
  },
  rightActionButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },
  finalCheckoutButton: {
    minHeight: 36,
    minWidth: 108,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },
  actionLabel: {
    fontSize: 11,
  },
});
