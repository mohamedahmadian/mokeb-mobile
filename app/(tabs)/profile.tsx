import { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import {
  ListCard,
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
import { notify } from "@/src/lib/notify";
import { colors, spacing, typography } from "@/src/lib/theme";

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
      notify("موفق", "پروفایل به‌روزرسانی شد");
      setActiveView("menu");
    } catch (error) {
      notify("خطا", error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        title={activeView === "edit" ? "ویرایش اطلاعات شخصی" : "پروفایل"}
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
              <Text style={styles.heroName}>{user?.fullName}</Text>
              <Text style={styles.heroMeta}>موکب‌دار</Text>
            </View>

            <View style={styles.menuList}>
              <ListCard
                title="ویرایش اطلاعات شخصی"
                titleIcon="person-circle-outline"
                onPress={() => {
                  setForm(createUserFormData(user));
                  setActiveView("edit");
                }}
              />
              <ListCard
                title="تغییر رمز عبور"
                titleIcon="key-outline"
                onPress={() => router.push("/menu/change-password")}
              />
              <ListCard
                title="خروج از سامانه"
                titleIcon="log-out-outline"
                onPress={() =>
                  notify(
                    "خروج از سامانه",
                    "آیا از خروج از حساب کاربری مطمئن هستید؟",
                    [
                      { text: "انصراف", style: "cancel" },
                      {
                        text: "خروج",
                        style: "destructive",
                        onPress: async () => {
                          await logout();
                          router.replace("/(auth)/login");
                        },
                      },
                    ],
                  )
                }
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
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "flex-end",
  },
  heroName: {
    ...typography.title,
    color: colors.primaryDark,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  menuList: {
    marginTop: spacing.sm,
  },
});
