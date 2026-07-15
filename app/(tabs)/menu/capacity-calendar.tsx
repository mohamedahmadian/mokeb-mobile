import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  CapacityStatusLegend,
  DayCapacityCard,
} from "@/src/components/capacity/DayCapacityCard";
import { PersianDateField } from "@/src/components/PersianDateField";
import {
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  defaultCapacityRange,
  getCapacityDateBounds,
  getInventoryHorizonMeta,
  isRangeWithinBounds,
} from "@/src/lib/capacity-date-range";
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
import { getInventoryRange } from "@/src/services/mawkib-inventory";
import { listMawkibs } from "@/src/services/mawkibs";
import type { Mawkib } from "@/src/types";

export default function CapacityCalendarScreen() {
  const { ownerId } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ mawkibId?: string }>();
  const paramMawkibId = params.mawkibId ? Number(params.mawkibId) : null;

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

  const horizon = useMemo(() => getInventoryHorizonMeta(), []);
  const dateBounds = useMemo(
    () =>
      getCapacityDateBounds(
        selectedMawkib?.serviceStartDate,
        selectedMawkib?.serviceEndDate,
        horizon,
      ),
    [selectedMawkib, horizon],
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
    () => defaultCapacityRange(dateBounds ?? undefined),
    [dateBounds],
  );

  const [startPersian, setStartPersian] = useState(
    formatPersianDate(defaults.startDate),
  );
  const [endPersian, setEndPersian] = useState(
    formatPersianDate(defaults.endDate),
  );
  const [appliedRange, setAppliedRange] = useState(defaults);

  useEffect(() => {
    setStartPersian(formatPersianDate(defaults.startDate));
    setEndPersian(formatPersianDate(defaults.endDate));
    setAppliedRange(defaults);
  }, [defaults.startDate, defaults.endDate]);

  const inventoryQuery = useQuery({
    queryKey: [
      "mawkib-inventory",
      selectedMawkibId,
      appliedRange.startDate,
      appliedRange.endDate,
    ],
    enabled: !!selectedMawkibId && !!dateBounds,
    queryFn: () =>
      getInventoryRange(
        selectedMawkibId!,
        appliedRange.startDate,
        appliedRange.endDate,
      ),
  });

  const applyRange = () => {
    const startDate = parsePersianDate(startPersian);
    const endDate = parsePersianDate(endPersian);
    if (!startDate || !endDate) {
      notify("خطا", "تاریخ‌ها را انتخاب کنید");
      return;
    }
    if (!dateBounds) {
      notify("توجه", "بازه خدمت یا افق ظرفیت برای این موکب تعریف نشده است");
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
    setAppliedRange({ startDate, endDate });
  };

  const days = inventoryQuery.data?.days ?? [];
  const minAvailableMale =
    days.length > 0 ? Math.min(...days.map((d) => d.availableMale)) : 0;
  const minAvailableFemale =
    days.length > 0 ? Math.min(...days.map((d) => d.availableFemale)) : 0;
  const fullDays = days.filter(
    (d) => d.availableMale <= 0 && d.availableFemale <= 0,
  ).length;

  if (!selectedMawkibId) {
    return (
      <ScreenContainer>
        <AppHeader
          title="تقویم ظرفیت"
          subtitle="انتخاب موکب"
          onBack={() => router.back()}
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
                subtitle={`ظرفیت ${formatPersianNumber(mawkib.maleCapacity + mawkib.femaleCapacity)} نفر`}
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
        title="تقویم ظرفیت"
        subtitle={selectedMawkib?.name ?? "موکب"}
        onBack={() => {
          if (mawkibs.length > 1 && !paramMawkibId) {
            setSelectedMawkibId(null);
            return;
          }
          router.back();
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
              بازه خدمت موکب تعریف نشده و افق ظرفیت در دسترس نیست.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.rangeCard}>
              <Text style={styles.rangeHint}>
                {dateBounds.isServicePeriod
                  ? "بازه خدمت موکب"
                  : `افق ظرفیت (${formatPersianNumber(horizon.horizonDays)} روز)`}
                : {formatPersianDate(dateBounds.minDate)} تا{" "}
                {formatPersianDate(dateBounds.maxDate)}
              </Text>
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
              <PrimaryButton
                label="نمایش"
                icon="calendar-outline"
                compact
                onPress={applyRange}
              />
            </View>

            <CapacityStatusLegend />

            {inventoryQuery.isFetching ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : days.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="روزی برای نمایش نیست"
              />
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <SummaryChip
                    label="روز"
                    value={formatPersianNumber(days.length)}
                  />
                  <SummaryChip
                    label="حداقل خالی آقا"
                    value={formatPersianNumber(minAvailableMale)}
                    tone="success"
                  />
                  <SummaryChip
                    label="حداقل خالی بانو"
                    value={formatPersianNumber(minAvailableFemale)}
                    tone="success"
                  />
                  <SummaryChip
                    label="روز پر"
                    value={formatPersianNumber(fullDays)}
                    tone="danger"
                  />
                </View>

                <View style={styles.dayGrid}>
                  {days.map((day) => (
                    <DayCapacityCard key={day.date} day={day} />
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
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const palette =
    tone === "success"
      ? { bg: colors.successLight, text: colors.success }
      : tone === "danger"
        ? { bg: colors.dangerLight, text: colors.danger }
        : { bg: colors.primaryLight, text: colors.primaryDark };

  return (
    <View style={[styles.summaryChip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.summaryValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: palette.text }]}>{label}</Text>
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
  rangeHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rangeInputs: {
    gap: spacing.sm,
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
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
