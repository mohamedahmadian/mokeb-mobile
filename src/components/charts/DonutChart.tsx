import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { Text } from "@/src/lib/fonts";
import { colors, spacing, typography } from "@/src/lib/theme";

export type ChartSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: ChartSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 22,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  let angle = 0;
  const positive = data.filter((item) => item.value > 0);
  const arcs =
    total <= 0
      ? []
      : positive.map((item) => {
          const sweep = (item.value / total) * 360;
          const startAngle = angle;
          const endAngle = angle + Math.min(sweep, 359.99);
          angle += sweep;
          return {
            ...item,
            sweep,
            path: describeArc(cx, cy, radius, startAngle, endAngle),
          };
        });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.borderLight}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {positive.length === 1 && positive[0].value > 0 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke={positive[0].color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            <G>
              {arcs.map((arc) => (
                <Path
                  key={arc.key}
                  d={arc.path}
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  fill="none"
                />
              ))}
            </G>
          )}
        </Svg>
        {(centerLabel || centerValue) && (
          <View style={styles.center} pointerEvents="none">
            {centerValue ? (
              <Text style={styles.centerValue}>{centerValue}</Text>
            ) : null}
            {centerLabel ? (
              <Text style={styles.centerLabel}>{centerLabel}</Text>
            ) : null}
          </View>
        )}
      </View>
      <View style={styles.legend}>
        {data.map((item) => (
          <View key={item.key} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.legendValue}>
              {item.value.toLocaleString("fa-IR")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: "700",
    fontSize: 20,
    textAlign: "center",
  },
  centerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  legend: {
    width: "100%",
    gap: spacing.xs,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    textAlign: "right",
  },
  legendValue: {
    ...typography.label,
    color: colors.textMuted,
  },
});
