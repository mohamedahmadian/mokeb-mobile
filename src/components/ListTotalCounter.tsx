import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text, fontFamilies } from "@/src/lib/fonts";
import { colors, radius, spacing } from "@/src/lib/theme";

type ListTotalCounterProps = {
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  accentSoft?: string;
};

export function ListTotalCounter({
  label,
  count,
  icon,
  accent = colors.primary,
  accentSoft = colors.primaryLight,
}: ListTotalCounterProps) {
  return (
    <View style={[styles.wrap, { backgroundColor: accentSoft }]}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[styles.count, { color: accent }]}>
        {count.toLocaleString("fa-IR")}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 64,
    maxWidth: 76,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  count: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    writingDirection: "rtl",
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
