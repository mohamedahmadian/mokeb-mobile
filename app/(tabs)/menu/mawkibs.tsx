import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  createMawkibFormData,
  MawkibProfileForm,
  mawkibFormToInput,
} from "@/src/components/MawkibProfileForm";
import {
  EmptyState,
  FloatingActionButton,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  SearchBar,
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { notify } from "@/src/lib/notify";
import { mawkibCityLabel, mawkibStatusLabel } from "@/src/lib/labels";
import { colors, spacing } from "@/src/lib/theme";
import {
  createMawkib,
  deleteMawkib,
  listMawkibs,
  updateMawkib,
} from "@/src/services/mawkibs";
import type { Mawkib } from "@/src/types";

export default function MawkibsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMawkibId, setEditingMawkibId] = useState<number | null>(null);
  const [form, setForm] = useState(createMawkibFormData());

  const { data: mawkibs = [], isLoading } = useQuery({
    queryKey: ["mawkibs", user?.id, query],
    enabled: !!user,
    queryFn: () => listMawkibs(user!.id, { query: query || undefined }),
  });

  const resetForm = () => {
    setEditingMawkibId(null);
    setForm(createMawkibFormData());
  };

  const openNewMawkib = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditMawkib = (mawkib: Mawkib) => {
    setEditingMawkibId(mawkib.id);
    setForm(createMawkibFormData(mawkib));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = mawkibFormToInput(form);
      return editingMawkibId
        ? updateMawkib(user!.id, editingMawkibId, input)
        : createMawkib(user!.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mawkibs"] });
      notify(
        "موفق",
        editingMawkibId ? "موکب به‌روزرسانی شد" : "موکب با موفقیت ثبت شد",
      );
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMawkib(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mawkibs"] });
      notify("موفق", "موکب حذف شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  return (
    <ScreenContainer>
      <AppHeader
        title={
          showForm
            ? editingMawkibId
              ? "ویرایش موکب"
              : "موکب جدید"
            : "موکب‌ها"
        }
        subtitle={showForm ? undefined : "مدیریت موکب‌های شما"}
        onBack={showForm ? closeForm : () => router.back()}
      />
      {!showForm ? (
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="نام، آدرس یا تلفن"
        />
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {showForm ? (
          <View style={styles.form}>
            <MawkibProfileForm value={form} onChange={setForm} />
          </View>
        ) : null}

        {!showForm && isLoading ? (
          <Text style={styles.loading}>در حال بارگذاری...</Text>
        ) : !showForm && mawkibs.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="موکبی ثبت نشده"
            description="اولین موکب خود را اضافه کنید."
          />
        ) : !showForm ? (
          mawkibs.map((mawkib) => (
            <View key={mawkib.id} style={styles.mawkibItem}>
              <ListCard
                title={mawkib.name}
                titleIcon="home-outline"
                badge={mawkibStatusLabel[mawkib.status]}
                details={[
                  {
                    icon: "location-outline",
                    label: "آدرس",
                    value: mawkib.address,
                  },
                  {
                    icon: "call-outline",
                    label: "تلفن",
                    value: mawkib.phoneNumber,
                  },
                  ...(mawkib.mawkibCity
                    ? [
                        {
                          icon: "business-outline" as const,
                          text: `شهر: ${mawkibCityLabel[mawkib.mawkibCity]}`,
                        },
                      ]
                    : []),
                  {
                    icon: "people-outline",
                    text: `ظرفیت: ${(
                      mawkib.maleCapacity + mawkib.femaleCapacity
                    ).toLocaleString("fa-IR")}`,
                  },
                ]}
                footer={
                  <View style={styles.itemActions}>
                    <PrimaryButton
                      label="ویرایش"
                      icon="create-outline"
                      variant="secondary"
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => openEditMawkib(mawkib)}
                    />
                    <PrimaryButton
                      label="رزرو"
                      icon="calendar-outline"
                      variant="secondary"
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/reservations",
                          params: {
                            mawkibId: String(mawkib.id),
                            reservationRequestId: String(Date.now()),
                          },
                        })
                      }
                    />
                    <PrimaryButton
                      label="حذف"
                      icon="trash-outline"
                      variant="danger"
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() =>
                        notify("حذف موکب", `آیا از حذف «${mawkib.name}» مطمئن هستید؟`, [
                          { text: "انصراف", style: "cancel" },
                          {
                            text: "حذف",
                            style: "destructive",
                            onPress: () => deleteMutation.mutate(mawkib.id),
                          },
                        ])
                      }
                    />
                  </View>
                }
              />
            </View>
          ))
        ) : null}
      </ScrollView>

      {showForm ? (
        <StickyBottomAction>
          <PrimaryButton
            label={editingMawkibId ? "ذخیره تغییرات" : "ثبت موکب"}
            icon={editingMawkibId ? "save-outline" : "checkmark"}
            loading={saveMutation.isPending}
            compact
            onPress={() => saveMutation.mutate()}
          />
        </StickyBottomAction>
      ) : (
        <FloatingActionButton label="موکب جدید" onPress={openNewMawkib} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  form: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mawkibItem: {
    marginBottom: 0,
  },
  itemActions: {
    direction: "ltr",
    flexDirection: "row",
    gap: spacing.sm,
  },
  itemAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
  },
  itemActionLabel: {
    fontSize: 11,
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
