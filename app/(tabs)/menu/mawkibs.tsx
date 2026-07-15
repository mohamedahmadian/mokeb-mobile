import { useEffect, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  createMawkibFormData,
  MawkibProfileForm,
  mawkibFormToInput,
} from "@/src/components/MawkibProfileForm";
import {
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
  SearchBar,
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { notify } from "@/src/lib/notify";
import { mawkibCityLabel, mawkibStatusLabel } from "@/src/lib/labels";
import { colors, radius, spacing } from "@/src/lib/theme";
import {
  createMawkib,
  deleteMawkib,
  listMawkibs,
  updateMawkib,
} from "@/src/services/mawkibs";
import type { Mawkib } from "@/src/types";

export default function MawkibsScreen() {
  const { user, ownerId, canDelete } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mawkibAction, mawkibRequestId } = useLocalSearchParams<{
    mawkibAction?: string;
    mawkibRequestId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMawkibId, setEditingMawkibId] = useState<number | null>(null);
  const [form, setForm] = useState(createMawkibFormData());

  const {
    data: mawkibs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["mawkibs", ownerId, query],
    enabled: !!ownerId,
    queryFn: () => listMawkibs(ownerId!, { query: query || undefined }),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await refetch();
  });

  const resetForm = () => {
    setEditingMawkibId(null);
    setForm(createMawkibFormData());
  };

  const openNewMawkib = () => {
    resetForm();
    setShowForm(true);
  };

  useEffect(() => {
    if (!mawkibRequestId || handledRequestId.current === mawkibRequestId) {
      return;
    }
    handledRequestId.current = mawkibRequestId;
    if (mawkibAction === "new") {
      openNewMawkib();
    }
  }, [mawkibAction, mawkibRequestId]);

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
        ? updateMawkib(ownerId!, editingMawkibId, input)
        : createMawkib(ownerId!, input);
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
    mutationFn: (id: number) => deleteMawkib(ownerId!, id),
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
          showForm ? (editingMawkibId ? "ویرایش موکب" : "موکب جدید") : "موکب‌ها"
        }
        subtitle={showForm ? undefined : "مدیریت موکب‌های شما"}
        onBack={showForm ? closeForm : undefined}
        showLogo={!showForm}
      />
      {!showForm ? (
        <View style={styles.listHeader}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="نام، نوع، آدرس یا تلفن"
          />
        </View>
      ) : null}

      <ScreenScroll
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        refreshControl={
          !showForm ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
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
                  ...(mawkib.mawkibType
                    ? [
                        {
                          icon: "business-outline" as const,
                          label: "نوع",
                          value: mawkib.mawkibType,
                        },
                      ]
                    : []),
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
                    {canDelete ? (
                      <PrimaryButton
                        label="حذف"
                        icon="trash-outline"
                        variant="danger"
                        style={styles.itemAction}
                        labelStyle={styles.itemActionLabel}
                        onPress={() =>
                          notify(
                            "حذف موکب",
                            `آیا از حذف «${mawkib.name}» مطمئن هستید؟`,
                            [
                              { text: "انصراف", style: "cancel" },
                              {
                                text: "حذف",
                                style: "destructive",
                                onPress: () => deleteMutation.mutate(mawkib.id),
                              },
                            ],
                          )
                        }
                      />
                    ) : null}
                  </View>
                }
              />
            </View>
          ))
        ) : null}
      </ScreenScroll>

      {showForm ? (
        <StickyBottomAction>
          <View style={styles.bottomActionCenter}>
            <PrimaryButton
              label={editingMawkibId ? "ذخیره تغییرات" : "ثبت موکب"}
              icon={editingMawkibId ? "save-outline" : "checkmark"}
              loading={saveMutation.isPending}
              compact
              style={styles.bottomActionButton}
              onPress={() => saveMutation.mutate()}
            />
          </View>
        </StickyBottomAction>
      ) : (
        <StickyBottomAction>
          <View style={styles.bottomActionCenter}>
            <PrimaryButton
              label="افزودن"
              icon="add-circle-outline"
              compact
              style={styles.bottomActionButton}
              onPress={openNewMawkib}
            />
          </View>
        </StickyBottomAction>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
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
    flexDirection: "row-reverse",
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
  bottomActionCenter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomActionButton: {
    alignSelf: "center",
    minWidth: 200,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
