import { ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { MealReservationCard } from "@/src/components/MealReservationCard";
import { EmptyState, ScreenContainer } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { spacing } from "@/src/lib/theme";
import { getReservationById } from "@/src/services/reservations";

export default function MealPlanScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    reservationId?: string;
    pilgrimName?: string;
    trackingCode?: string;
  }>();

  const reservationId = Number(params.reservationId);
  const hasReservation =
    Number.isFinite(reservationId) && reservationId > 0;

  const reservationQuery = useQuery({
    queryKey: ["reservation", user?.id, reservationId],
    enabled: !!user && hasReservation,
    queryFn: () => getReservationById(user!.id, reservationId),
  });

  const subtitleParts = [
    params.pilgrimName?.trim(),
    params.trackingCode?.trim(),
  ].filter(Boolean);

  if (!hasReservation) {
    return (
      <ScreenContainer>
        <AppHeader
          title="برنامه غذایی"
          subtitle="برنامه غذایی وابسته به رزرو است"
          onBack={() => router.back()}
        />
        <EmptyState
          icon="restaurant-outline"
          title="رزرو انتخاب نشده"
          description="از لیست رزروها روی دکمه «برنامه غذایی» بزنید."
        />
      </ScreenContainer>
    );
  }

  const reservation = reservationQuery.data;

  return (
    <ScreenContainer>
      <AppHeader
        title="برنامه غذایی"
        subtitle={
          subtitleParts.length
            ? subtitleParts.join(" • ")
            : reservation?.pilgrimName ?? "مدیریت وعده‌های این رزرو"
        }
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {reservationQuery.isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="خطا در بارگذاری"
            description={
              reservationQuery.error instanceof Error
                ? reservationQuery.error.message
                : "رزرو یافت نشد"
            }
          />
        ) : !reservation && !reservationQuery.isLoading ? (
          <EmptyState
            icon="calendar-outline"
            title="رزرو یافت نشد"
            description="این رزرو در دسترس نیست یا حذف شده است."
          />
        ) : reservation ? (
          <MealReservationCard reservation={reservation} />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});
