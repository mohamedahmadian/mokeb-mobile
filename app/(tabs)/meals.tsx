import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { MealReservationCard } from "@/src/components/MealReservationCard";
import {
  EmptyState,
  ListCard,
  ScreenContainer,
  SearchBar,
  SearchBarStickyWrap,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { notify } from "@/src/lib/notify";
import { colors, spacing } from "@/src/lib/theme";
import { lookupReservation } from "@/src/services/reservations";

type MealsView = "menu" | "search";

export default function MealsScreen() {
  const { user } = useAuth();
  const { mealsView, mealsRequestId } = useLocalSearchParams<{
    mealsView?: MealsView;
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
    if (mealsView === "search") {
      setQuery("");
      setActiveView("search");
    }
  }, [mealsView, mealsRequestId]);

  const lookupQuery = useQuery({
    queryKey: ["meals-lookup", user?.id, debouncedQuery],
    enabled: activeView === "search" && !!user && debouncedQuery.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => lookupReservation(user!.id, debouncedQuery),
  });

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
        title={activeView === "search" ? "جستجوی زائر" : "وعده غذایی"}
        subtitle={
          activeView === "menu" ? "مدیریت برنامه و تحویل وعده‌ها" : undefined
        }
        onBack={activeView !== "menu" ? closeView : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={activeView === "search" ? [0] : undefined}
      >
        {activeView === "menu" ? (
          <View style={styles.menu}>
            <ListCard
              title="جستجوی زائر"
              titleIcon="search-outline"
              subtitle="جستجو با کد رزرو، موبایل یا کد ملی و مدیریت برنامه غذایی"
              onPress={() => openView("search")}
            />
            <ListCard
              title="گزارش وعده غذایی"
              titleIcon="document-text-outline"
              subtitle="به‌زودی در نسخه‌های بعدی فعال می‌شود"
              onPress={() =>
                notify("توجه", "گزارش وعده غذایی هنوز پیاده‌سازی نشده است")
              }
            />
          </View>
        ) : (
          <SearchBarStickyWrap>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="کد رزرو، موبایل یا کد ملی"
            />
          </SearchBarStickyWrap>
        )}

        {activeView === "search" ? (
          <>
            {!debouncedQuery ? (
              <EmptyState
                icon="search-outline"
                title="جستجوی زائر"
                description="کد رزرو، شماره موبایل یا کد ملی زائر را وارد کنید."
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
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    direction: "rtl",
  },
  content: {
    width: "100%",
    direction: "rtl",
    alignItems: "stretch",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  menu: {
    width: "100%",
    direction: "rtl",
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
