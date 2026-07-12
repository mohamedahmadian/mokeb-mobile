import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/src/lib/theme";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showProfile?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  onBack,
  showProfile = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {showProfile ? (
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="پروفایل کاربر"
          >
            <Ionicons name="people" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="بازگشت"
          >
            <Ionicons name="arrow-forward" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    direction: "rtl",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    width: "100%",
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  iconButtonPressed: {
    opacity: 0.75,
  },
  sideSlot: {
    width: 44,
    height: 44,
  },
  titleWrap: {
    flex: 1,
    direction: "rtl",
    alignItems: "stretch",
  },
  title: {
    ...typography.subtitle,
    width: "100%",
    color: colors.text,
    textAlign: "right",
  },
  subtitle: {
    ...typography.caption,
    width: "100%",
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
});
