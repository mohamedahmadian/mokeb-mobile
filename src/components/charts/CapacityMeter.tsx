import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Text } from "@/src/lib/fonts";
import { colors, spacing, typography } from "@/src/lib/theme";

type CapacityMeterProps = {
  label: string;
  capacity: number;
  filled: number;
  remaining: number;
  color?: string;
  compact?: boolean;
};

export function CapacityMeter({
  label,
  capacity,
  filled,
  remaining,
  color = colors.primary,
  compact = false,
}: CapacityMeterProps) {
  const size = compact ? 64 : 84;
  const strokeWidth = compact ? 8 : 10;
  const radiusRing = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusRing;
  const ratio = capacity > 0 ? Math.min(1, filled / capacity) : 0;
  const dashOffset = circumference * (1 - ratio);
  const cx = size / 2;
  const cy = size / 2;
  const pct = Math.round(ratio * 100);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={radiusRing}
            stroke={colors.borderLight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <G rotation="-90" origin={`${cx}, ${cy}`}>
            <Circle
              cx={cx}
              cy={cy}
              r={radiusRing}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.pct, compact && styles.pctCompact]}>
            {pct.toLocaleString("fa-IR")}٪
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.label, compact && styles.labelCompact]}>
          {label}
        </Text>
        <Text style={styles.numbers}>
          {filled.toLocaleString("fa-IR")} / {capacity.toLocaleString("fa-IR")}
        </Text>
        <Text style={styles.remaining}>
          باقیمانده {remaining.toLocaleString("fa-IR")}
        </Text>
      </View>
    </View>
  );
}

type CapacityStatGridProps = {
  maleCapacity: number;
  femaleCapacity: number;
  totalCapacity: number;
  maleFilled: number;
  femaleFilled: number;
  totalFilled: number;
  maleRemaining: number;
  femaleRemaining: number;
  totalRemaining: number;
  compact?: boolean;
};

export function CapacityStatGrid({
  maleCapacity,
  femaleCapacity,
  totalCapacity,
  maleFilled,
  femaleFilled,
  totalFilled,
  maleRemaining,
  femaleRemaining,
  totalRemaining,
  compact = false,
}: CapacityStatGridProps) {
  return (
    <View style={[styles.grid, compact && styles.gridCompact]}>
      <CapacityMeter
        label="آقا"
        capacity={maleCapacity}
        filled={maleFilled}
        remaining={maleRemaining}
        color="#0284c7"
        compact={compact}
      />
      <CapacityMeter
        label="بانو"
        capacity={femaleCapacity}
        filled={femaleFilled}
        remaining={femaleRemaining}
        color="#be185d"
        compact={compact}
      />
      <CapacityMeter
        label="کل"
        capacity={totalCapacity}
        filled={totalFilled}
        remaining={totalRemaining}
        color={colors.accent}
        compact={compact}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 96,
  },
  wrapCompact: {
    minWidth: 88,
    gap: spacing.xs,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  pct: {
    ...typography.label,
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  pctCompact: {
    fontSize: 11,
  },
  meta: {
    alignItems: "center",
    gap: 2,
  },
  label: {
    ...typography.label,
    color: colors.text,
    fontWeight: "600",
  },
  labelCompact: {
    fontSize: 12,
  },
  numbers: {
    ...typography.caption,
    color: colors.textMuted,
  },
  remaining: {
    ...typography.caption,
    color: colors.success,
    fontSize: 11,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    width: "100%",
  },
  gridCompact: {
    gap: spacing.xs,
  },
});
