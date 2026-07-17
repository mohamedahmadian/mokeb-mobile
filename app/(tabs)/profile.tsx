import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import {
  PrimaryButton,
  ScreenContainer,
  StickyBottomAction,
} from "@/src/components/ui";
import {
  createUserFormData,
  UserProfileForm,
  userFormToInput,
} from "@/src/components/UserProfileForm";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { fontFamilies } from "@/src/lib/fonts";
import { notify } from "@/src/lib/notify";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

type ProfileMenuItemProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isLast?: boolean;
};

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ProfileMenuItem({
  title,
  icon,
  onPress,
  isLast = false,
}: ProfileMenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        !isLast && styles.menuItemBorder,
        pressed && styles.menuItemPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        <View style={styles.menuItemIconWrap}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const router = useRouter();
  const { profileView, profileRequestId } = useLocalSearchParams<{
    profileView?: string;
    profileRequestId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [form, setForm] = useState(() => createUserFormData(user));
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"menu" | "edit">("menu");

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await refreshUser();
  });

  useEffect(() => {
    setForm(createUserFormData(user));
  }, [user]);

  useEffect(() => {
    if (!profileRequestId || handledRequestId.current === profileRequestId) {
      return;
    }
    handledRequestId.current = profileRequestId;
    if (profileView === "edit") {
      setForm(createUserFormData(user));
      setActiveView("edit");
    }
  }, [profileView, profileRequestId, user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile(userFormToInput(form));
      notify("موفق", "اطلاعات حساب کاربری به‌روزرسانی شد");
      setActiveView("menu");
    } catch (error) {
      notify("خطا", error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    notify("خروج از سامانه", "آیا از خروج از حساب کاربری مطمئن هستید؟", [
      { text: "انصراف", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <AppHeader
        title={
          activeView === "edit" ? "ویرایش اطلاعات شخصی" : "حساب کاربری"
        }
        subtitle={
          activeView === "menu" ? (user?.mobileNumber ?? "") : undefined
        }
        showProfile={false}
        onBack={
          activeView === "edit"
            ? () => setActiveView("menu")
            : () => router.back()
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {activeView === "menu" ? (
          <>
            <View style={styles.hero}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              <Text style={styles.heroName}>{user?.fullName}</Text>
              {user?.mobileNumber ? (
                <Text style={styles.heroMeta}>{user.mobileNumber}</Text>
              ) : null}
            </View>

            <ProfileSection title="مدیریت حساب">
              <ProfileMenuItem
                title="ویرایش اطلاعات شخصی"
                icon="person-circle-outline"
                onPress={() => {
                  setForm(createUserFormData(user));
                  setActiveView("edit");
                }}
              />
              <ProfileMenuItem
                title="تغییر رمز عبور"
                icon="key-outline"
                onPress={() => router.push("/menu/change-password")}
                isLast
              />
            </ProfileSection>

            <ProfileSection title="اطلاعات">
              <ProfileMenuItem
                title="درباره ما"
                icon="information-circle-outline"
                onPress={() => router.push("/menu/about-us")}
                isLast
              />
            </ProfileSection>

            <View style={styles.logoutWrap}>
              <PrimaryButton
                label="خروج از سامانه"
                icon="log-out-outline"
                variant="dangerOutline"
                onPress={handleLogout}
              />
            </View>
          </>
        ) : (
          <View style={styles.form}>
            <UserProfileForm value={form} onChange={setForm} />
          </View>
        )}
      </ScrollView>
      {activeView === "edit" ? (
        <StickyBottomAction>
          <PrimaryButton
            label="ذخیره اطلاعات"
            icon="save-outline"
            loading={saving}
            compact
            onPress={handleSave}
          />
        </StickyBottomAction>
      ) : null}
      <NewReservationFab bottomOffset={activeView === "edit" ? 72 : 0} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  hero: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#d7e3f2",
    marginBottom: spacing.md,
  },
  heroName: {
    ...typography.title,
    color: colors.primaryDark,
    textAlign: "center",
  },
  heroMeta: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemPressed: {
    backgroundColor: colors.borderLight,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
  },
  menuItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTitle: {
    ...typography.subtitle,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  logoutWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
