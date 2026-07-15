import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { MealReservationCard } from "@/src/components/MealReservationCard";
import { MealDeliveryView } from "@/src/components/meals/MealDeliveryView";
import {
  EmptyState,
  ListCard,
  ScreenContainer,
  ScreenScroll,
  SearchBar,
  SearchBarStickyWrap,
} from "@/src/components/ui";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { colors, spacing } from "@/src/lib/theme";
import { lookupReservation } from "@/src/services/reservations";

type MealsView = "menu" | "search" | "delivery";

export default function MealsScreen() {
  const { ownerId } = useAuth();
  const router = useRouter();
  const { mealsView, mealsQuery, mealsRequestId } = useLocalSearchParams<{
    mealsView?: MealsView;
    mealsQuery?: string;
    mealsRequestId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<MealsView>("menu");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());

  useEffect(() => {
    if (!mealsRequestId || handledRequestId.current === mealsRequestId) {
      return;
    }
    handledRequestId.current = mealsRequestId;
    if (mealsView === "search" || mealsQuery) {
      setActiveView("search");
      setQuery(mealsQuery ?? "");
    }
  }, [mealsView, mealsQuery, mealsRequestId]);

  const lookupQuery = useQuery({
    queryKey: ["meals-lookup", ownerId, debouncedQuery],
    enabled: activeView === "search" && !!ownerId && debouncedQuery.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => lookupReservation(ownerId!, debouncedQuery),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    if (activeView === "search" && debouncedQuery.length > 0) {
      await lookupQuery.refetch();
    }
  });

  const headerTitle =
    activeView === "search"
      ? "جستجوی زائر"
      : activeView === "delivery"
        ? "تحویل غذا"
        : "وعده غذایی";

  const results = useMemo(() => lookupQuery.data ?? [], [lookupQuery.data]);
  const showEmpty =
    debouncedQuery.length > 0 &&
    !lookupQuery.isFetching &&
    results.length === 0;

  const openView = (view: MealsView) => {
    setQuery("");
    setActiveView(view);
  };

  const closeView = () => {
    setQuery("");
    setActiveView("menu");
  };

  return (
    <ScreenContainer>
      <AppHeader
        title={headerTitle}
        subtitle={
          activeView === "menu" ? "مدیریت برنامه و تحویل وعده‌ها" : undefined
        }
        onBack={activeView !== "menu" ? closeView : undefined}
        showLogo
      />

      <ScreenScroll
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={activeView === "search" ? [0] : undefined}
        refreshControl={
          activeView === "search" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {activeView === "menu" ? (
          <View style={styles.menu}>
            <ListCard
              title="جستجوی زائر"
              titleIcon="search-outline"
              subtitle="جستجو با نام، کد رزرو، موبایل یا کد ملی و مدیریت برنامه غذایی"
              onPress={() => openView("search")}
            />
            <ListCard
              title="تحویل غذا"
              titleIcon="restaurant-outline"
              subtitle="لیست وعده‌های روز و ثبت تحویل به زائرین"
              onPress={() => openView("delivery")}
            />
            <ListCard
              title="گزارش وعده غذایی"
              titleIcon="pie-chart-outline"
              subtitle="نمودار تحویل وعده به‌ازای هر روز"
              onPress={() => router.push("/menu/meal-report")}
            />
          </View>
        ) : activeView === "delivery" ? (
          <MealDeliveryView />
        ) : (
          <SearchBarStickyWrap>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="نام و نام خانوادگی، کد رزرو، موبایل یا کد ملی"
              autoFocus
              flushRight
            />
          </SearchBarStickyWrap>
        )}

        {activeView === "search" ? (
          <>
            {!debouncedQuery ? (
              <EmptyState
                icon="search-outline"
                title="جستجوی زائر"
                description="نام و نام خانوادگی، کد رزرو، شماره موبایل یا کد ملی زائر را وارد کنید."
              />
            ) : null}

            {lookupQuery.isFetching && results.length === 0 ? (
              <Text style={styles.loading}>در حال جستجو...</Text>
            ) : null}

            {showEmpty ? (
              <EmptyState
                icon="search-outline"
                title="رزروی یافت نشد"
                description="رزرو تایید شده‌ای با این مشخصات پیدا نشد."
              />
            ) : null}

            {results.map((reservation) => (
              <MealReservationCard
                key={reservation.id}
                reservation={reservation}
                searchMode
              />
            ))}
          </>
        ) : null}
      </ScreenScroll>
      <NewReservationFab />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    alignItems: "stretch",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  menu: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
