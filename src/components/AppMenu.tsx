import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMenu } from "@/src/contexts/MenuContext";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  tint: string;
  bg: string;
};

const menuItems: MenuItem[] = [
  {
    label: "داشبورد",
    icon: "grid-outline",
    href: "/menu/dashboard",
    tint: colors.primary,
    bg: colors.primaryLight,
  },
  {
    label: "موکب‌ها",
    icon: "home-outline",
    href: "/menu/mawkibs",
    tint: colors.accent,
    bg: colors.accentLight,
  },
  {
    label: "تغییر رمز عبور",
    icon: "key-outline",
    href: "/menu/change-password",
    tint: colors.textMuted,
    bg: colors.borderLight,
  },
];

export function AppMenu() {
  const { isOpen, closeMenu } = useMenu();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={closeMenu}
    >
      <Pressable style={styles.overlay} onPress={closeMenu}>
        <Pressable
          style={[
            styles.panel,
            { marginTop: insets.top + spacing.sm, marginEnd: spacing.lg },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          {/* RTL: عنوان در سمت راست، دکمه بستن در سمت چپ */}
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleWrap}>
              <Text style={styles.panelTitle}>منو</Text>
            </View>
            <Pressable
              onPress={closeMenu}
              accessibilityLabel="بستن منو"
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <Pressable
                key={item.href}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => {
                  closeMenu();
                  router.push(item.href as never);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                {/* RTL: آیکن سمت راست، متن در وسط، فلش سمت چپ */}
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.tint} />
                </View>
                <View style={styles.menuLabelWrap}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.textSubtle}
                />
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    direction: "rtl",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    // RTL: flex-start = سمت راست (شروع جهت RTL)
    // پنل منو از گوشه بالا-راست ظاهر می‌شود
    alignItems: "flex-start",
  },
  panel: {
    width: 280,
    direction: "rtl",
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // RTL: عنوان (اول) در سمت راست، دکمه بستن (دوم) در سمت چپ
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  panelTitle: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: "right",
  },
  panelTitleWrap: {
    flex: 1,
    alignItems: "flex-start",
  },
  // RTL: آیکن (اول) → راست، متن (دوم) → وسط، فلش (سوم) → چپ
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemPressed: {
    backgroundColor: colors.borderLight,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    textAlign: "right",
  },
  menuLabelWrap: {
    flex: 1,
    alignItems: "flex-start",
  },
});
