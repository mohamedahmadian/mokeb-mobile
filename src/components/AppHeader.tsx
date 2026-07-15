import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusedBackHandler } from "@/src/hooks/useAppBackHandler";
import { colors, spacing, typography } from "@/src/lib/theme";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** فقط در داشبورد */
  showProfile?: boolean;
  /** لوگوی پروژه — داشبورد و صفحات لیست */
  showLogo?: boolean;
};

function HeaderLogo() {
  return (
    <View style={styles.logoSlot} accessibilityLabel="لوگوی سامانه">
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  showProfile = false,
  showLogo = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useFocusedBackHandler(
    onBack
      ? () => {
          onBack();
          return true;
        }
      : null,
  );

  const leftSlot = showProfile ? (
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
  ) : showLogo && onBack ? (
    <HeaderLogo />
  ) : (
    <View style={styles.sideSlot} />
  );

  const rightSlot = onBack ? (
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
  ) : showLogo ? (
    <HeaderLogo />
  ) : (
    <View style={styles.sideSlot} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {leftSlot}

        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    width: "100%",
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
  logoSlot: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 40,
    height: 40,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.subtitle,
    width: "100%",
    color: colors.text,
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    ...typography.caption,
    width: "100%",
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
