import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { colors, radius, spacing } from "@/src/lib/theme";

export type AppToastVariant = "success" | "error" | "warning" | "info";

type AppToastProps = {
  title: string;
  message?: string;
  variant: AppToastVariant;
  onClose?: () => void;
};

const variantConfig: Record<
  AppToastVariant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    iconBg: string;
    iconColor: string;
    cardBg: string;
    border: string;
  }
> = {
  success: {
    icon: "checkmark-circle",
    accent: colors.success,
    iconBg: colors.successLight,
    iconColor: colors.success,
    cardBg: "#f0fdf8",
    border: "#a7f3d0",
  },
  error: {
    icon: "close-circle",
    accent: colors.danger,
    iconBg: colors.dangerLight,
    iconColor: colors.danger,
    cardBg: "#fef7f7",
    border: "#fecaca",
  },
  warning: {
    icon: "alert-circle",
    accent: colors.warning,
    iconBg: colors.warningLight,
    iconColor: colors.warning,
    cardBg: "#fffbeb",
    border: "#fde68a",
  },
  info: {
    icon: "information-circle",
    accent: colors.primary,
    iconBg: colors.primaryLight,
    iconColor: colors.primary,
    cardBg: colors.surface,
    border: colors.border,
  },
};

export function AppToast({ title, message, variant, onClose }: AppToastProps) {
  const config = variantConfig[variant];

  return (
    <View style={styles.host}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: config.cardBg,
            borderColor: config.border,
            borderRightColor: config.accent,
          },
        ]}
      >
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="بستن"
          >
            <Ionicons name="close" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : (
          <View style={styles.closeSpacer} />
        )}

        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
          <Ionicons name={config.icon} size={22} color={config.iconColor} />
        </View>
      </View>
    </View>
  );
}

const rtlTextBase = {
  textAlign: "right" as const,
  writingDirection: "rtl" as const,
  width: "100%" as const,
};

const styles = StyleSheet.create({
  host: {
    width: "100%",
    alignSelf: "stretch",
  },
  card: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderRightWidth: 4,
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  closeSpacer: {
    width: 28,
    flexShrink: 0,
  },
  closeButtonPressed: {
    opacity: 0.6,
    backgroundColor: colors.borderLight,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: "stretch",
    gap: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    ...rtlTextBase,
    fontFamily: "Vazir-Medium",
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  message: {
    ...rtlTextBase,
    fontFamily: "Vazir",
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
