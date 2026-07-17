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
} from "@/src/components/ui";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { useTabRefresh } from "@/src/hooks/useTabRefresh";
import { colors, spacing } from "@/src/lib/theme";
import { lookupReservation } from "@/src/services/reservations";

import type { MealType } from "@/src/types";

type MealsView = "menu" | "search" | "delivery";

const MEAL_TYPE_VALUES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function parseMealTypeParam(value?: string): MealType | undefined {
  if (!value) return undefined;
  return MEAL_TYPE_VALUES.includes(value as MealType)
    ? (value as MealType)
    : undefined;
}

export default function MealsScreen() {
  const { ownerId } = useAuth();
  const router = useRouter();
  const {
    mealsView,
    mealsQuery,
    mealsRequestId,
    deliveryDate,
    deliveryMealType,
    deliveryMawkibId,
    returnTo,
    mealReportReturnTo,
    mealReportMawkibId,
  } = useLocalSearchParams<{
    mealsView?: MealsView;
    mealsQuery?: string;
    mealsRequestId?: string;
    deliveryDate?: string;
    deliveryMealType?: string;
    deliveryMawkibId?: string;
    returnTo?: "meal-report";
    mealReportReturnTo?: "meals" | "dashboard";
    mealReportMawkibId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<MealsView>("menu");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const deliveryMawkibIdNumber = deliveryMawkibId
    ? Number(deliveryMawkibId)
    : undefined;
  const parsedDeliveryMealType = parseMealTypeParam(deliveryMealType);

  useEffect(() => {
    if (!mealsRequestId || handledRequestId.current === mealsRequestId) {
      return;
    }
    handledRequestId.current = mealsRequestId;
    if (mealsView === "delivery") {
      setActiveView("delivery");
      setQuery("");
      return;
    }
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
    if (returnTo === "meal-report") {
      router.navigate({
        pathname: "/menu/meal-report",
        params: {
          returnTo: mealReportReturnTo === "dashboard" ? "dashboard" : "meals",
          ...(mealReportMawkibId ? { mawkibId: mealReportMawkibId } : {}),
        },
      });
      return;
    }
    setQuery("");
    setActiveView("menu");
  };

  useTabRefresh({
    onReset: () => {
      setQuery("");
      setActiveView("menu");
    },
    onRefresh: () => {
      void lookupQuery.refetch();
    },
  });

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

      {activeView === "search" ? (
        <View style={styles.searchToolbar}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="نام و نام خانوادگی، کد رزرو، موبایل یا کد ملی"
            autoFocus
            flushRight
          />
        </View>
      ) : null}

      <ScreenScroll
        key={activeView}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
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
              title="گزارش تحویل غذا"
              titleIcon="pie-chart-outline"
              subtitle="گزارش تحویل غذا به‌ازای هر روز"
              onPress={() =>
                router.push({
                  pathname: "/menu/meal-report",
                  params: { returnTo: "meals" },
                })
              }
            />
          </View>
        ) : activeView === "delivery" ? (
          <MealDeliveryView
            key={mealsRequestId ?? "delivery-default"}
            initialDate={deliveryDate}
            initialMealType={parsedDeliveryMealType}
            initialMawkibId={
              deliveryMawkibIdNumber != null &&
              Number.isFinite(deliveryMawkibIdNumber)
                ? deliveryMawkibIdNumber
                : undefined
            }
            autoShowList={!!deliveryDate}
          />
        ) : null}

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
  searchToolbar: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
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
