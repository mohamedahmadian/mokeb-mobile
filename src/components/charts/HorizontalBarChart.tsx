import { StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

export type BarItem = {
  key: string;
  label: string;
  value: number;
  color?: string;
};

type HorizontalBarChartProps = {
  data: BarItem[];
  maxBars?: number;
  accent?: string;
};

export function HorizontalBarChart({
  data,
  accent = colors.primary,
}: HorizontalBarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1);

  if (data.length === 0) {
    return (
      <Text style={styles.empty}>داده‌ای برای نمایش وجود ندارد</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {data.map((item) => {
        const widthPct = Math.max(6, (item.value / max) * 100);
        return (
          <View key={item.key} style={styles.row}>
            <Text style={styles.value}>
              {item.value.toLocaleString("fa-IR")}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${widthPct}%`,
                    backgroundColor: item.color ?? accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    width: 78,
    color: colors.text,
    textAlign: "right",
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
    // Fill grows from the right for RTL reading
    alignItems: "flex-end",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
  },
  value: {
    ...typography.caption,
    width: 36,
    color: colors.textMuted,
    textAlign: "left",
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    paddingVertical: spacing.md,
  },
});
