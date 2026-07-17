import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  DayMealReportCard,
  MealReportStatusLegend,
} from "@/src/components/meals/DayMealReportCard";
import { PersianDateField } from "@/src/components/PersianDateField";
import {
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { isRangeWithinBounds } from "@/src/lib/capacity-date-range";
import { fontFamilies } from "@/src/lib/fonts";
import { Text } from "@/src/lib/fonts";
import { notify } from "@/src/lib/notify";
import {
  formatPersianDate,
  formatPersianDateParts,
  formatPersianNumber,
  parsePersianDate,
} from "@/src/lib/persianDate";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import {
  defaultMealReportRange,
  getMealReportDateBounds,
  getMealReportRange,
  type MealReportMealFilter,
} from "@/src/services/meals";
import { listMawkibs } from "@/src/services/mawkibs";
import type { MealType, Mawkib } from "@/src/types";
import { mealTypeLabel } from "@/src/lib/labels";

const MEAL_REPORT_FILTERS: { value: MealReportMealFilter; label: string }[] = [
  { value: "All", label: "همه" },
  { value: "Breakfast", label: mealTypeLabel.Breakfast },
  { value: "Lunch", label: mealTypeLabel.Lunch },
  { value: "Dinner", label: mealTypeLabel.Dinner },
];

function mealReportFilterLabel(filter: MealReportMealFilter) {
  return filter === "All" ? "همه وعده‌ها" : mealTypeLabel[filter];
}

export default function MealReportScreen() {
  const { ownerId } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mawkibId?: string;
    returnTo?: "meals" | "dashboard";
  }>();
  const paramMawkibId = params.mawkibId ? Number(params.mawkibId) : null;
  const returnTo = params.returnTo === "dashboard" ? "dashboard" : "meals";

  const exitMealReport = () => {
    if (returnTo === "dashboard") {
      router.navigate("/(tabs)/dashboard");
      return;
    }
    router.navigate("/(tabs)/meals");
  };

  const mawkibsQuery = useQuery({
    queryKey: ["mawkibs", ownerId],
    enabled: !!ownerId,
    queryFn: () => listMawkibs(ownerId!),
  });

  const mawkibs = mawkibsQuery.data ?? [];
  const [selectedMawkibId, setSelectedMawkibId] = useState<number | null>(
    paramMawkibId && Number.isFinite(paramMawkibId) ? paramMawkibId : null,
  );

  useEffect(() => {
    if (selectedMawkibId != null) return;
    if (paramMawkibId && Number.isFinite(paramMawkibId)) {
      setSelectedMawkibId(paramMawkibId);
      return;
    }
    if (mawkibs.length === 1) {
      setSelectedMawkibId(mawkibs[0].id);
    }
  }, [mawkibs, paramMawkibId, selectedMawkibId]);

  const selectedMawkib =
    mawkibs.find((item) => item.id === selectedMawkibId) ?? null;

  const dateBounds = useMemo(
    () =>
      getMealReportDateBounds(
        selectedMawkib?.serviceStartDate,
        selectedMawkib?.serviceEndDate,
      ),
    [selectedMawkib],
  );

  const boundYears = useMemo(() => {
    if (!dateBounds) return null;
    const minParts = formatPersianDateParts(
      formatPersianDate(dateBounds.minDate),
    );
    const maxParts = formatPersianDateParts(
      formatPersianDate(dateBounds.maxDate),
    );
    if (!minParts || !maxParts) return null;
    return { from: minParts.jy, to: maxParts.jy };
  }, [dateBounds]);

  const defaults = useMemo(
    () => defaultMealReportRange(dateBounds ?? undefined),
    [dateBounds],
  );

  const [startPersian, setStartPersian] = useState(
    formatPersianDate(defaults.startDate),
  );
  const [endPersian, setEndPersian] = useState(
    formatPersianDate(defaults.endDate),
  );
  const [appliedRange, setAppliedRange] = useState(defaults);
  const [selectedMealFilter, setSelectedMealFilter] =
    useState<MealReportMealFilter>("All");
  const [appliedMealFilter, setAppliedMealFilter] =
    useState<MealReportMealFilter>("All");
  const [reportApplied, setReportApplied] = useState(false);

  useEffect(() => {
    setStartPersian(formatPersianDate(defaults.startDate));
    setEndPersian(formatPersianDate(defaults.endDate));
    setAppliedRange(defaults);
    setReportApplied(false);
  }, [defaults.startDate, defaults.endDate]);

  const reportQuery = useQuery({
    queryKey: [
      "meal-report",
      ownerId,
      selectedMawkibId,
      appliedRange.startDate,
      appliedRange.endDate,
      appliedMealFilter,
    ],
    enabled: !!ownerId && !!selectedMawkibId && !!dateBounds && reportApplied,
    queryFn: () =>
      getMealReportRange(
        ownerId!,
        selectedMawkibId!,
        appliedRange.startDate,
        appliedRange.endDate,
        appliedMealFilter,
      ),
  });

  const applyRange = async () => {
    const startDate = parsePersianDate(startPersian);
    const endDate = parsePersianDate(endPersian);
    if (!startDate || !endDate) {
      notify("خطا", "تاریخ‌ها را انتخاب کنید");
      return;
    }
    if (!dateBounds) {
      notify("توجه", "بازه تاریخ برای این موکب در دسترس نیست");
      return;
    }
    if (
      !isRangeWithinBounds(
        startDate,
        endDate,
        dateBounds.minDate,
        dateBounds.maxDate,
      )
    ) {
      notify(
        "خطا",
        `بازه باید بین ${formatPersianDate(dateBounds.minDate)} و ${formatPersianDate(dateBounds.maxDate)} باشد`,
      );
      return;
    }
    if (!ownerId || !selectedMawkibId) return;

    const range = { startDate, endDate };
    setAppliedRange(range);
    setAppliedMealFilter(selectedMealFilter);
    setReportApplied(true);

    // همان بازه دوباره انتخاب شود، کلید query عوض نمی‌شود؛ داده را از دیتابیس بخوان.
    await queryClient.fetchQuery({
      queryKey: [
        "meal-report",
        ownerId,
        selectedMawkibId,
        range.startDate,
        range.endDate,
        selectedMealFilter,
      ],
      queryFn: () =>
        getMealReportRange(
          ownerId,
          selectedMawkibId,
          range.startDate,
          range.endDate,
          selectedMealFilter,
        ),
    });
  };

  const openDeliveryForDay = (date: string) => {
    if (!reportApplied || !selectedMawkibId) return;

    const deliveryMealType: MealType =
      appliedMealFilter === "All" ? "Lunch" : appliedMealFilter;

    router.push({
      pathname: "/(tabs)/meals",
      params: {
        mealsView: "delivery",
        deliveryDate: date,
        deliveryMealType,
        deliveryMawkibId: String(selectedMawkibId),
        mealsRequestId: String(Date.now()),
        returnTo: "meal-report",
        mealReportReturnTo: returnTo,
        mealReportMawkibId: String(selectedMawkibId),
      },
    });
  };

  const days = reportQuery.data?.days ?? [];
  const rangeTotal = days.reduce((sum, day) => sum + day.totalCount, 0);
  const rangeServed = days.reduce((sum, day) => sum + day.servedCount, 0);
  const rangeRemaining = Math.max(0, rangeTotal - rangeServed);

  if (!selectedMawkibId) {
    return (
      <ScreenContainer>
        <AppHeader
          title="گزارش وعده غذایی"
          subtitle="انتخاب موکب"
          onBack={() => exitMealReport()}
          showLogo
        />
        <ScreenScroll contentContainerStyle={styles.content}>
          {mawkibsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : mawkibs.length === 0 ? (
            <EmptyState
              icon="home-outline"
              title="موکبی ثبت نشده"
              description="ابتدا یک موکب ثبت کنید."
            />
          ) : (
            mawkibs.map((mawkib: Mawkib) => (
              <ListCard
                key={mawkib.id}
                title={mawkib.name}
                titleIcon="home-outline"
                subtitle={mawkib.address}
                onPress={() => setSelectedMawkibId(mawkib.id)}
              />
            ))
          )}
        </ScreenScroll>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        title="گزارش وعده غذایی"
        subtitle={selectedMawkib?.name ?? "موکب"}
        onBack={() => {
          if (mawkibs.length > 1 && !paramMawkibId) {
            setSelectedMawkibId(null);
            return;
          }
          exitMealReport();
        }}
        showLogo
      />

      <ScreenScroll contentContainerStyle={styles.content}>
        {mawkibs.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mawkibChips}
          >
            {mawkibs.map((mawkib) => {
              const active = mawkib.id === selectedMawkibId;
              return (
                <Pressable
                  key={mawkib.id}
                  onPress={() => setSelectedMawkibId(mawkib.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipLabel, active && styles.chipLabelActive]}
                  >
                    {mawkib.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!dateBounds ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              بازه تاریخ برای این موکب در دسترس نیست.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.rangeCard}>
              <View style={styles.rangeInputs}>
                <PersianDateField
                  label="از تاریخ"
                  value={startPersian}
                  onChange={setStartPersian}
                  placeholder="انتخاب تاریخ شروع"
                  yearFrom={boundYears?.from}
                  yearTo={boundYears?.to}
                />
                <PersianDateField
                  label="تا تاریخ"
                  value={endPersian}
                  onChange={setEndPersian}
                  placeholder="انتخاب تاریخ پایان"
                  yearFrom={boundYears?.from}
                  yearTo={boundYears?.to}
                />
              </View>

              <View style={styles.mealFilterSection}>
                <Text style={styles.mealFilterTitle}>وعده غذایی</Text>
                <View style={styles.mealFilterRow}>
                  {MEAL_REPORT_FILTERS.map((filter) => {
                    const active = selectedMealFilter === filter.value;
                    return (
                      <Pressable
                        key={filter.value}
                        onPress={() => setSelectedMealFilter(filter.value)}
                        style={[
                          styles.mealFilterChip,
                          active && styles.mealFilterChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.mealFilterChipLabel,
                            active && styles.mealFilterChipLabelActive,
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <PrimaryButton
                label="نمایش"
                icon="pie-chart-outline"
                compact
                onPress={applyRange}
              />
            </View>

            {reportQuery.isFetching ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : !reportApplied ? (
              <EmptyState
                icon="pie-chart-outline"
                title="بازه و وعده را انتخاب کنید"
                description="پس از انتخاب تاریخ و وعده غذایی، روی «نمایش» بزنید."
              />
            ) : days.length === 0 ? (
              <EmptyState
                icon="restaurant-outline"
                title="روزی برای نمایش نیست"
              />
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <SummaryChip
                    label="کل"
                    value={formatPersianNumber(rangeTotal)}
                    mealHint={mealReportFilterLabel(appliedMealFilter)}
                  />
                  <SummaryChip
                    label="تحویل"
                    value={formatPersianNumber(rangeServed)}
                    tone="success"
                    mealHint={mealReportFilterLabel(appliedMealFilter)}
                  />
                  <SummaryChip
                    label="باقیمانده"
                    value={formatPersianNumber(rangeRemaining)}
                    tone={rangeRemaining > 0 ? "warning" : "success"}
                    mealHint={mealReportFilterLabel(appliedMealFilter)}
                  />
                </View>

                <MealReportStatusLegend />

                <View style={styles.dayGrid}>
                  {days.map((day) => (
                    <DayMealReportCard
                      key={day.date}
                      day={day}
                      onPress={() => openDeliveryForDay(day.date)}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScreenScroll>
    </ScreenContainer>
  );
}

function SummaryChip({
  label,
  value,
  mealHint,
  tone = "default",
}: {
  label: string;
  value: string;
  mealHint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const palette =
    tone === "success"
      ? { bg: colors.successLight, text: colors.success }
      : tone === "warning"
        ? { bg: colors.warningLight, text: colors.warning }
        : { bg: colors.primaryLight, text: colors.primaryDark };

  return (
    <View style={[styles.summaryChip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.summaryValue, { color: palette.text }]}>
        {value}
      </Text>
      <Text style={[styles.summaryLabel, { color: palette.text }]}>
        {label}
      </Text>
      {mealHint ? (
        <Text style={styles.summaryMealHint}>{mealHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  mawkibChips: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.primaryDark,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
  },
  rangeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rangeInputs: {
    gap: spacing.sm,
  },
  mealFilterSection: {
    gap: spacing.xs,
  },
  mealFilterTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  mealFilterRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  mealFilterChip: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  mealFilterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  mealFilterChipLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  mealFilterChipLabelActive: {
    fontFamily: fontFamilies.medium,
    color: colors.primaryDark,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  summaryChip: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 72,
    alignItems: "center",
  },
  summaryValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
  },
  summaryLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  summaryMealHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: 2,
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
