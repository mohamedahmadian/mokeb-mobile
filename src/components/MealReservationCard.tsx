import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListCard, PrimaryButton } from "@/src/components/ui";
import { MealPlanPanel } from "@/src/components/MealPlanPanel";
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
  listMealPlans,
  regenerateMealPlans,
  toggleMealRequired,
  toggleMealServed,
} from "@/src/services/meals";
import type { MealPlan, Reservation } from "@/src/types";

type MealReservationCardProps = {
  reservation: Reservation;
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

export function MealReservationCard({ reservation }: MealReservationCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busyMealId, setBusyMealId] = useState<number | null>(null);
  const presenceColors = presenceBadgeColor(reservation.presenceState);

  const mealsQuery = useQuery({
    queryKey: ["meal-plans", user?.id, reservation.id],
    enabled: !!user,
    queryFn: () => listMealPlans(user!.id, reservation.id),
  });

  const invalidateMeals = () =>
    queryClient.invalidateQueries({
      queryKey: ["meal-plans", user?.id, reservation.id],
    });

  const createMutation = useMutation({
    mutationFn: () => regenerateMealPlans(user!.id, reservation.id),
    onSuccess: () => {
      invalidateMeals();
      notify("موفق", "برنامه غذایی ایجاد شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const requiredMutation = useMutation({
    mutationFn: ({
      mealPlanId,
      isRequired,
    }: {
      mealPlanId: number;
      isRequired: boolean;
    }) => {
      setBusyMealId(mealPlanId);
      return toggleMealRequired(user!.id, mealPlanId, isRequired);
    },
    onSuccess: invalidateMeals,
    onError: (error: Error) => notify("خطا", error.message),
    onSettled: () => setBusyMealId(null),
  });

  const servedMutation = useMutation({
    mutationFn: ({
      mealPlanId,
      isServed,
    }: {
      mealPlanId: number;
      isServed: boolean;
    }) => {
      setBusyMealId(mealPlanId);
      return toggleMealServed(user!.id, mealPlanId, isServed);
    },
    onSuccess: invalidateMeals,
    onError: (error: Error) => notify("خطا", error.message),
    onSettled: () => setBusyMealId(null),
  });

  const handleCreate = () => {
    notify(
      "ایجاد برنامه غذایی",
      "در صورت تأیید، تمام برنامه غذایی قبلی این رزرو حذف می‌شود و از تاریخ شروع تا پایان اقامت، هر سه وعده (صبحانه، ناهار، شام) دوباره ایجاد می‌شود.",
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "ایجاد برنامه",
          style: "destructive",
          onPress: () => createMutation.mutate(),
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
            <PrimaryButton
              label="ایجاد برنامه غذایی"
              icon="add-circle-outline"
              variant="secondary"
              compact
              loading={createMutation.isPending}
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={handleCreate}
            />
            <PrimaryButton
              label="مشاهده برنامه غذایی"
              icon="list-outline"
              variant="primary"
              compact
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={() => mealsQuery.refetch()}
            />
          </View>
        }
      />

      <MealPlanPanel
        meals={mealsQuery.data ?? []}
        loading={mealsQuery.isLoading}
        busyMealId={busyMealId}
        onToggleRequired={(meal: MealPlan, isRequired) =>
          requiredMutation.mutate({ mealPlanId: meal.id, isRequired })
        }
        onToggleServed={(meal: MealPlan, isServed) =>
          servedMutation.mutate({ mealPlanId: meal.id, isServed })
        }
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
  actionButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
  },
  actionLabel: {
    fontSize: 11,
  },
});
