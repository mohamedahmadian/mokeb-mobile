import { StyleSheet, View } from "react-native";
import { CapacityMeter } from "@/src/components/charts/CapacityMeter";
import { Text } from "@/src/lib/fonts";
import { fontFamilies } from "@/src/lib/fonts";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import {
  persianDayNumber,
  persianMonthLabel,
  persianWeekdayLabel,
} from "@/src/lib/persianDate";
import { colors, radius, spacing } from "@/src/lib/theme";
import type { MealReportDay } from "@/src/services/meals";

function dayCardPalette(day: MealReportDay) {
  if (day.totalCount <= 0) {
    return {
      border: colors.border,
      bg: colors.surface,
    };
  }
  if (day.remainingCount <= 0) {
    return {
      border: "#a7f3d0",
      bg: "#ecfdf5",
    };
  }
  if (day.servedCount <= 0) {
    return {
      border: "#fed7aa",
      bg: "#fff7ed",
    };
  }
  return {
    border: "#bae6fd",
    bg: "#f0f9ff",
  };
}

type DayMealReportCardProps = {
  day: MealReportDay;
};

export function DayMealReportCard({ day }: DayMealReportCardProps) {
  const palette = dayCardPalette(day);
  const isToday = day.date === todayDateStringInAppTz();
  const hasMeals = day.totalCount > 0;

  return (
    <View
      style={[
        styles.dayCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.bg,
        },
        isToday && styles.dayCardToday,
      ]}
    >
      <View style={styles.dayHeader}>
        <Text style={styles.weekday}>{persianWeekdayLabel(day.date)}</Text>
        <Text style={styles.dayNumber}>{persianDayNumber(day.date)}</Text>
        <Text style={styles.monthLabel}>{persianMonthLabel(day.date)}</Text>
      </View>

      {hasMeals ? (
        <CapacityMeter
          label="تحویل"
          capacity={day.totalCount}
          filled={day.servedCount}
          remaining={day.remainingCount}
          color={
            day.remainingCount <= 0
              ? "#34d399"
              : day.servedCount <= 0
                ? "#fb923c"
                : undefined
          }
          compact
          completeLabel="همه تحویل شده"
          completeTone="success"
          remainingLabelTemplate="{n} باقیمانده"
        />
      ) : (
        <View style={styles.emptyMeals}>
          <Text style={styles.emptyMealsText}>بدون وعده</Text>
        </View>
      )}
    </View>
  );
}

export function MealReportStatusLegend() {
  return (
    <View style={styles.legend}>
      <LegendItem color="#fed7aa" label="تحویل‌نشده" />
      <LegendItem color="#bae6fd" label="نیمه‌تحویل" />
      <LegendItem color="#a7f3d0" label="کامل تحویل" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayCard: {
    width: "48%",
    minHeight: 168,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayHeader: {
    alignItems: "center",
    gap: 2,
  },
  weekday: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  dayNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
    lineHeight: 24,
  },
  monthLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSubtle,
    textAlign: "center",
  },
  emptyMeals: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
  },
  emptyMealsText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
});
