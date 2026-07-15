import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AttendanceEventTimeline } from "@/src/components/AttendanceEventTimeline";
import { PendingDeliveredItemsCheckoutModal } from "@/src/components/PendingDeliveredItemsCheckoutModal";
import { ListCard, PrimaryButton } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { presenceStateLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import {
  getReservationSearchCardDetails,
  getReservationSearchCardStyle,
} from "@/src/lib/reservation-search-card";
import { colors, spacing } from "@/src/lib/theme";
import {
  getAttendanceActionVisibility,
  listAttendanceEvents,
} from "@/src/services/attendance";
import { listPendingDeliveredItemsByReservation } from "@/src/services/delivered-items";
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
  const { user, ownerId } = useAuth();
  const visibility = getAttendanceActionVisibility(reservation);
  const presenceColors = presenceBadgeColor(reservation.presenceState);
  const [pendingItemsModalVisible, setPendingItemsModalVisible] =
    useState(false);

  const eventsQuery = useQuery({
    queryKey: ["attendance-events", ownerId, reservation.id],
    enabled: !!ownerId,
    queryFn: () => listAttendanceEvents(ownerId!, reservation.id),
  });

  const confirmFinalCheckout = () => {
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

  const handleFinalCheckout = async () => {
    if (!ownerId) return;

    const pendingItems = await listPendingDeliveredItemsByReservation(
      ownerId,
      reservation.id,
    );

    if (pendingItems.length > 0) {
      setPendingItemsModalVisible(true);
      return;
    }

    confirmFinalCheckout();
  };

  return (
    <View style={styles.wrap}>
      <ListCard
        title={reservation.pilgrimName ?? "زائر"}
        titleIcon="person-outline"
        badge={presenceStateLabel[reservation.presenceState]}
        badgeColor={presenceColors.bg}
        badgeTextColor={presenceColors.text}
        style={getReservationSearchCardStyle(reservation.status)}
        details={getReservationSearchCardDetails(reservation)}
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

      <PendingDeliveredItemsCheckoutModal
        visible={pendingItemsModalVisible}
        reservation={reservation}
        onClose={() => setPendingItemsModalVisible(false)}
        onProceedCheckout={confirmFinalCheckout}
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
