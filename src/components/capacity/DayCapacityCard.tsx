import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { fontFamilies } from "@/src/lib/fonts";
import {
  formatPersianNumber,
  persianDayNumber,
  persianMonthLabel,
  persianWeekdayLabel,
} from "@/src/lib/persianDate";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { colors, radius, spacing } from "@/src/lib/theme";
import type { MawkibDailyInventoryDay } from "@/src/services/mawkib-inventory";

export type DayCapacityStatus = "available" | "partial" | "full";

export function getDayCapacityStatus(
  day: Pick<MawkibDailyInventoryDay, "availableMale" | "availableFemale">,
): DayCapacityStatus {
  const maleFull = day.availableMale <= 0;
  const femaleFull = day.availableFemale <= 0;
  if (maleFull && femaleFull) return "full";
  if (maleFull || femaleFull) return "partial";
  return "available";
}

const statusPalette: Record<
  DayCapacityStatus,
  {
    cardBorder: string;
    cardBg: string;
    barMale: string;
    barFemale: string;
  }
> = {
  available: {
    cardBorder: "#bae6fd",
    cardBg: "#f0f9ff",
    barMale: "#38bdf8",
    barFemale: "#7dd3fc",
  },
  partial: {
    cardBorder: "#a7f3d0",
    cardBg: "#ecfdf5",
    barMale: "#10b981",
    barFemale: "#34d399",
  },
  full: {
    cardBorder: "#fecaca",
    cardBg: "#fef2f2",
    barMale: "#f87171",
    barFemale: "#fca5a5",
  },
};

function RemainingHint({ available }: { available: number }) {
  if (available <= 0) {
    return <Text style={styles.fullHint}>تکمیل ظرفیت</Text>;
  }
  return (
    <Text style={styles.remainingHint}>
      ({formatPersianNumber(available)} خالی)
    </Text>
  );
}

function CapacityBar({
  label,
  reserved,
  available,
  total,
  barColor,
}: {
  label: string;
  reserved: number;
  available: number;
  total: number;
  barColor: string;
}) {
  const occupiedRatio =
    total > 0 ? Math.min(1, Math.max(0, reserved / total)) : 0;

  return (
    <View style={styles.barBlock}>
      <View style={styles.barHeader}>
        <Text style={styles.barFraction}>
          {formatPersianNumber(reserved)}/{formatPersianNumber(total)}
        </Text>
        <View style={styles.barLabelRow}>
          <Text style={styles.barLabel}>{label}</Text>
          <RemainingHint available={available} />
        </View>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${occupiedRatio * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

type DayCapacityCardProps = {
  day: MawkibDailyInventoryDay;
  onPress?: () => void;
};

export function DayCapacityCard({ day, onPress }: DayCapacityCardProps) {
  const status = getDayCapacityStatus(day);
  const palette = statusPalette[status];
  const isToday = day.date === todayDateStringInAppTz();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.dayCard,
        {
          borderColor: palette.cardBorder,
          backgroundColor: palette.cardBg,
        },
        isToday && styles.dayCardToday,
        pressed && onPress && styles.dayCardPressed,
      ]}
    >
      <View style={styles.dayHeader}>
        <Text style={styles.weekday}>{persianWeekdayLabel(day.date)}</Text>
        <Text style={styles.dayNumber}>{persianDayNumber(day.date)}</Text>
        <Text style={styles.monthLabel}>{persianMonthLabel(day.date)}</Text>
      </View>

      <View style={styles.bars}>
        <CapacityBar
          label="آقا"
          reserved={day.reservedMale}
          available={day.availableMale}
          total={day.maleCapacity}
          barColor={palette.barMale}
        />
        <CapacityBar
          label="بانو"
          reserved={day.reservedFemale}
          available={day.availableFemale}
          total={day.femaleCapacity}
          barColor={palette.barFemale}
        />
      </View>
    </Pressable>
  );
}

export function CapacityStatusLegend() {
  return (
    <View style={styles.legend}>
      <LegendItem color="#bae6fd" label="روز با ظرفیت آزاد" />
      <LegendItem color="#a7f3d0" label="بخشی پر شده" />
      <LegendItem color="#fecaca" label="کاملاً پر" />
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
    minHeight: 148,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCardPressed: {
    opacity: 0.88,
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
  bars: {
    gap: spacing.sm,
  },
  barBlock: {
    gap: 3,
  },
  barHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  barLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  barLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  remainingHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.success,
  },
  fullHint: {
    fontFamily: fontFamilies.medium,
    fontSize: 8,
    color: colors.danger,
  },
  barFraction: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.text,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
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
