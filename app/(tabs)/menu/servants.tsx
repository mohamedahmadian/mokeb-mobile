import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  AppInput,
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { notify } from "@/src/lib/notify";
import { fontFamilies } from "@/src/lib/fonts";
import { colors, spacing } from "@/src/lib/theme";
import {
  createServant,
  deleteServant,
  listServants,
  updateServant,
} from "@/src/services/servants";
import type { User } from "@/src/types";

type ServantForm = {
  fullName: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
};

const emptyForm = (): ServantForm => ({
  fullName: "",
  mobileNumber: "",
  password: "",
  confirmPassword: "",
});

export default function ServantsScreen() {
  const { ownerId, canManageStaff } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServantForm>(emptyForm);

  const servantsQuery = useQuery({
    queryKey: ["servants", ownerId],
    enabled: !!ownerId && canManageStaff,
    queryFn: () => listServants(ownerId!),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await servantsQuery.refetch();
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (servant: User) => {
    setEditingId(servant.id);
    setForm({
      fullName: servant.fullName,
      mobileNumber: servant.mobileNumber,
      password: "",
      confirmPassword: "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.password || form.confirmPassword) {
        if (form.password !== form.confirmPassword) {
          throw new Error("رمز عبور و تکرار آن یکسان نیست");
        }
      }
      if (!editingId && !form.password) {
        throw new Error("رمز عبور را وارد کنید");
      }

      const payload = {
        fullName: form.fullName,
        mobileNumber: form.mobileNumber,
        password: form.password || undefined,
      };

      if (editingId) {
        return updateServant(ownerId!, editingId, payload);
      }
      return createServant(ownerId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servants"] });
      notify(
        "موفق",
        editingId ? "اطلاعات خادم به‌روزرسانی شد" : "خادم جدید ثبت شد",
      );
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteServant(ownerId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servants"] });
      notify("موفق", "خادم حذف شد");
      if (editingId) closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const handleDelete = (servant: User) => {
    notify(
      "حذف خادم",
      `آیا از حذف «${servant.fullName}» مطمئن هستید؟ این خادم دیگر نمی‌تواند وارد شود.`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => deleteMutation.mutate(servant.id),
        },
      ],
    );
  };

  if (!canManageStaff) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const servants = servantsQuery.data ?? [];

  return (
    <ScreenContainer>
      <AppHeader
        title={showForm ? (editingId ? "ویرایش خادم" : "خادم جدید") : "خادمین"}
        onBack={() => (showForm ? closeForm() : router.back())}
        showLogo
      />

      {showForm ? (
        <>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.hint}>
                خادم با شماره موبایل و رمز عبور وارد می‌شود و به جای شما عملیات
                روزمره موکب را انجام می‌دهد؛ بدون دسترسی به مدیریت، گزارشات و
                حذف داده‌ها.
              </Text>
              <AppInput
                label="نام و نام خانوادگی"
                value={form.fullName}
                onChangeText={(fullName) =>
                  setForm((f) => ({ ...f, fullName }))
                }
                placeholder="مثلاً علی رضایی"
              />
              <AppInput
                label="شماره موبایل"
                value={form.mobileNumber}
                onChangeText={(mobileNumber) =>
                  setForm((f) => ({ ...f, mobileNumber }))
                }
                placeholder="09121234567"
                keyboardType="phone-pad"
              />
              <AppInput
                label={editingId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
                value={form.password}
                onChangeText={(password) =>
                  setForm((f) => ({ ...f, password }))
                }
                placeholder="حداقل ۶ کاراکتر"
                secureTextEntry
              />
              <AppInput
                label={editingId ? "تکرار رمز جدید" : "تکرار رمز عبور"}
                value={form.confirmPassword}
                onChangeText={(confirmPassword) =>
                  setForm((f) => ({ ...f, confirmPassword }))
                }
                placeholder="تکرار رمز عبور"
                secureTextEntry
              />
              {editingId ? (
                <PrimaryButton
                  label="حذف خادم"
                  icon="trash-outline"
                  variant="dangerOutline"
                  loading={deleteMutation.isPending}
                  onPress={() => {
                    const servant = servants.find((s) => s.id === editingId);
                    if (servant) handleDelete(servant);
                  }}
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
          <StickyBottomAction>
            <PrimaryButton
              label={editingId ? "ذخیره تغییرات" : "ثبت خادم"}
              icon={editingId ? "save-outline" : "checkmark"}
              loading={saveMutation.isPending}
              onPress={() => saveMutation.mutate()}
            />
          </StickyBottomAction>
        </>
      ) : (
        <>
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
            {servantsQuery.isLoading ? (
              <Text style={styles.loading}>در حال بارگذاری...</Text>
            ) : servants.length === 0 ? (
              <>
                <EmptyState
                  icon="people-circle-outline"
                  title="خادمی ثبت نشده"
                  description="خادم‌ها می‌توانند به‌جای شما رزرو، ورود و خروج و وعده غذایی را مدیریت کنند."
                />
                <PrimaryButton
                  label="خادم جدید"
                  icon="person-add-outline"
                  onPress={openNew}
                />
              </>
            ) : (
              servants.map((servant) => (
                <ListCard
                  key={servant.id}
                  title={servant.fullName}
                  subtitle={servant.mobileNumber}
                  meta="خادم موکب"
                  footer={
                    <View style={styles.actions}>
                      <PrimaryButton
                        label="ویرایش"
                        icon="create-outline"
                        variant="secondary"
                        compact
                        style={styles.itemAction}
                        labelStyle={styles.itemActionLabel}
                        onPress={() => openEdit(servant)}
                      />
                      <PrimaryButton
                        label="حذف"
                        icon="trash-outline"
                        variant="dangerOutline"
                        compact
                        style={styles.itemAction}
                        labelStyle={styles.itemActionLabel}
                        onPress={() => handleDelete(servant)}
                      />
                    </View>
                  }
                />
              ))
            )}
          </ScrollView>
          {servants.length > 0 ? (
            <StickyBottomAction>
              <PrimaryButton
                label="خادم جدید"
                icon="person-add-outline"
                onPress={openNew}
              />
            </StickyBottomAction>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  formContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl + 120,
    flexGrow: 1,
  },
  hint: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
  },
  loading: {
    textAlign: "center",
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    marginTop: spacing.xl,
  },
  actions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemAction: {
    flexGrow: 1,
    minWidth: "45%",
  },
  itemActionLabel: {
    fontSize: 12,
  },
});
