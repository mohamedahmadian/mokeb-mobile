import { RefreshControl, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { MealReservationCard } from "@/src/components/MealReservationCard";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { EmptyState, ScreenContainer, ScreenScroll } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { colors, spacing } from "@/src/lib/theme";
import { getReservationById } from "@/src/services/reservations";

function paramString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function MealPlanScreen() {
  const { ownerId } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    reservationId?: string | string[];
    pilgrimName?: string | string[];
    trackingCode?: string | string[];
  }>();

  const reservationId = Number(paramString(params.reservationId));
  const hasReservation = Number.isFinite(reservationId) && reservationId > 0;
  const pilgrimName = paramString(params.pilgrimName)?.trim();
  const trackingCode = paramString(params.trackingCode)?.trim();

  const reservationQuery = useQuery({
    queryKey: ["reservation", ownerId, reservationId],
    enabled: !!ownerId && hasReservation,
    queryFn: () => getReservationById(ownerId!, reservationId),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await reservationQuery.refetch();
  });

  const subtitleParts = [pilgrimName, trackingCode].filter(Boolean);

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
        <NewReservationFab />
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
            : (reservation?.pilgrimName ?? "مدیریت وعده‌های این رزرو")
        }
        onBack={() => router.back()}
      />

      <ScreenScroll
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
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
      </ScreenScroll>
      <NewReservationFab />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});
