import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
  SearchBar,
  SearchToolbar,
  SearchToolbarField,
  StickyBottomAction,
} from "@/src/components/ui";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { PilgrimFiltersModal } from "@/src/components/PilgrimFiltersModal";
import {
  createUserFormData,
  UserProfileForm,
  userFormToInput,
} from "@/src/components/UserProfileForm";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { useTabRefresh } from "@/src/hooks/useTabRefresh";
import { genderLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import {
  createEmptyPilgrimFilterForm,
  hasActivePilgrimFilters,
  pilgrimFilterFormToListFilters,
  pilgrimListFiltersToForm,
} from "@/src/lib/pilgrim-filters";
import { colors, spacing } from "@/src/lib/theme";
import { clearSectionDataForPilgrim } from "@/src/services/data-management";
import {
  countPilgrims,
  createPilgrim,
  getPilgrimById,
  listPilgrims,
  updatePilgrim,
} from "@/src/services/pilgrims";
import type { User } from "@/src/types";

export default function PilgrimsScreen() {
  const { ownerId, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pilgrimAction, pilgrimRequestId, pilgrimId } = useLocalSearchParams<{
    pilgrimAction?: string;
    pilgrimRequestId?: string;
    pilgrimId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => createUserFormData());
  const [editingPilgrimId, setEditingPilgrimId] = useState<number | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftFilters, setDraftFilters] = useState(
    createEmptyPilgrimFilterForm,
  );
  const [appliedFilters, setAppliedFilters] = useState(
    createEmptyPilgrimFilterForm,
  );

  const listFilters = useMemo(
    () => pilgrimFilterFormToListFilters(appliedFilters),
    [appliedFilters],
  );
  const hasFilters = hasActivePilgrimFilters(listFilters);

  const resetForm = () => {
    setEditingPilgrimId(null);
    setForm(createUserFormData());
  };

  const openNewPilgrim = () => {
    resetForm();
    setShowForm(true);
  };

  useEffect(() => {
    if (!pilgrimRequestId || handledRequestId.current === pilgrimRequestId) {
      return;
    }
    handledRequestId.current = pilgrimRequestId;
    if (pilgrimAction === "new") {
      openNewPilgrim();
    } else if (pilgrimAction === "search") {
      setShowForm(false);
      setQuery("");
    } else if (pilgrimAction === "edit" && pilgrimId) {
      const id = Number(pilgrimId);
      if (Number.isFinite(id)) {
        void getPilgrimById(id).then((pilgrim) => {
          if (pilgrim) {
            openEditPilgrim(pilgrim);
          }
        });
      }
    }
  }, [pilgrimAction, pilgrimRequestId, pilgrimId]);

  const openEditPilgrim = (pilgrim: User) => {
    setEditingPilgrimId(pilgrim.id);
    setForm(createUserFormData(pilgrim));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const {
    data: pilgrims = [],
    isLoading,
    isFetching,
    refetch: refetchPilgrims,
  } = useQuery({
    queryKey: ["pilgrims", ownerId, debouncedQuery, listFilters],
    enabled: !!ownerId,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listPilgrims(ownerId!, {
        query: debouncedQuery || undefined,
        ...listFilters,
      }),
  });

  const { data: totalPilgrims = 0, refetch: refetchPilgrimCount } = useQuery({
    queryKey: ["pilgrims-count", ownerId],
    enabled: !!ownerId && !showForm,
    queryFn: () => countPilgrims(ownerId!),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([refetchPilgrims(), refetchPilgrimCount()]);
  });

  useTabRefresh({
    onReset: () => {
      closeForm();
      setFilterModalVisible(false);
    },
    onRefresh: () => {
      void queryClient.invalidateQueries({ queryKey: ["pilgrims"] });
      void queryClient.invalidateQueries({ queryKey: ["pilgrims-count"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const input = userFormToInput(form);
      return editingPilgrimId
        ? updatePilgrim(editingPilgrimId, input)
        : createPilgrim({
            ...input,
            fullName: form.fullName,
            mobileNumber: form.mobileNumber,
          });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilgrims"] });
      queryClient.invalidateQueries({ queryKey: ["pilgrims-count"] });
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deletePilgrimMutation = useMutation({
    mutationFn: (pilgrimId: number) =>
      clearSectionDataForPilgrim(ownerId!, "pilgrims", pilgrimId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pilgrims"] }),
        queryClient.invalidateQueries({ queryKey: ["pilgrims-count"] }),
        queryClient.invalidateQueries({ queryKey: ["pilgrims-options"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations-count"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["meals-lookup"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-lookup"] }),
        queryClient.invalidateQueries({ queryKey: ["meal-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["management-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["pilgrim-section-stats"] }),
      ]);
      notify("موفق", "اطلاعات این زائر با موفقیت پاک شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const handleDeletePilgrim = (pilgrim: User) => {
    notify(
      "حذف اطلاعات این زائر",
      `با حذف «${pilgrim.fullName}»، رزروها، ورود و خروج و وعده‌های مرتبط نیز پاک می‌شود. ادامه می‌دهید؟`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "پاک کردن",
          style: "destructive",
          onPress: () => deletePilgrimMutation.mutate(pilgrim.id),
        },
      ],
    );
  };

  const openFilterModal = () => {
    setDraftFilters(pilgrimListFiltersToForm(listFilters));
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setFilterModalVisible(false);
  };

  return (
    <ScreenContainer>
      <AppHeader
        title={
          showForm ? (editingPilgrimId ? "ویرایش زائر" : "زائر جدید") : "زائرین"
        }
        subtitle={showForm ? undefined : "مدیریت و جستجوی زائرین"}
        onBack={showForm ? closeForm : undefined}
        showLogo={!showForm}
      />

      {!showForm ? (
        <>
          <View style={styles.listToolbar}>
            <SearchToolbar>
              <Pressable
                style={({ pressed }) => [
                  styles.filterButton,
                  hasFilters && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={openFilterModal}
                accessibilityRole="button"
                accessibilityLabel="فیلتر زائرین"
              >
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={hasFilters ? colors.primaryDark : colors.textMuted}
                />
                {hasFilters ? <View style={styles.filterBadge} /> : null}
              </Pressable>
              <SearchToolbarField>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="نام، موبایل یا کد ملی"
                  autoFocus
                  embedded
                />
              </SearchToolbarField>
            </SearchToolbar>
          </View>

          <ScreenScroll
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="on-drag"
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
            {isLoading && pilgrims.length === 0 ? (
              <Text style={styles.loading}>در حال بارگذاری...</Text>
            ) : pilgrims.length === 0 && !isFetching ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="people-outline"
                  title={
                    hasFilters || debouncedQuery
                      ? "زائری با این مشخصات یافت نشد"
                      : "زائری جهت نمایش وجود ندارد"
                  }
                />
                {!hasFilters && !debouncedQuery ? (
                  <PrimaryButton
                    label="زائر جدید"
                    icon="person-add-outline"
                    compact
                    onPress={openNewPilgrim}
                  />
                ) : null}
              </View>
            ) : (
              pilgrims.map((pilgrim) => (
                <View key={pilgrim.id} style={styles.pilgrimItem}>
                  <ListCard
                    title={pilgrim.fullName}
                    titleIcon="person-outline"
                    details={[
                      {
                        icon: "call-outline",
                        label: "شماره همراه",
                        value: pilgrim.mobileNumber,
                      },
                      ...(pilgrim.nationalId
                        ? [
                            {
                              icon: "id-card-outline" as const,
                              label: "کد ملی",
                              value: pilgrim.nationalId,
                            },
                          ]
                        : []),
                      ...(pilgrim.gender
                        ? [
                            {
                              icon: "male-female-outline" as const,
                              label: "جنسیت",
                              value: `${genderLabel[pilgrim.gender]}`,
                            },
                          ]
                        : []),
                      ...(pilgrim.city
                        ? [
                            {
                              icon: "location-outline" as const,
                              label: "شهر",
                              value: pilgrim.city,
                            },
                          ]
                        : []),
                    ]}
                    footer={
                      <View style={styles.itemActions}>
                        <View style={styles.itemActionsRow}>
                          <PrimaryButton
                            label="تاریخچه رزروها"
                            icon="time-outline"
                            variant="secondary"
                            style={styles.itemAction}
                            labelStyle={styles.itemActionLabel}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/reservations",
                                params: {
                                  reservationAction: "history",
                                  pilgrimMobile: pilgrim.mobileNumber,
                                  pilgrimName: pilgrim.fullName,
                                  reservationRequestId: String(Date.now()),
                                },
                              })
                            }
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
                                  pilgrimId: String(pilgrim.id),
                                  pilgrimName: pilgrim.fullName,
                                  pilgrimMobile: pilgrim.mobileNumber,
                                  pilgrimGender: pilgrim.gender ?? "",
                                  reservationRequestId: String(Date.now()),
                                },
                              })
                            }
                          />
                          <PrimaryButton
                            label="ویرایش"
                            icon="create-outline"
                            variant="secondary"
                            style={styles.itemAction}
                            labelStyle={styles.itemActionLabel}
                            onPress={() => openEditPilgrim(pilgrim)}
                          />
                        </View>
                        <View style={styles.itemActionsRow}>
                          {canDelete ? (
                            <PrimaryButton
                              label="حذف"
                              icon="trash-outline"
                              variant="dangerOutline"
                              style={styles.itemAction}
                              labelStyle={styles.itemActionLabel}
                              loading={
                                deletePilgrimMutation.isPending &&
                                deletePilgrimMutation.variables === pilgrim.id
                              }
                              onPress={() => handleDeletePilgrim(pilgrim)}
                            />
                          ) : (
                            <View style={styles.itemAction} />
                          )}
                          <PrimaryButton
                            label="ورود و خروج"
                            icon="log-in-outline"
                            variant="secondary"
                            style={styles.itemAction}
                            labelStyle={styles.itemActionLabel}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/attendance",
                                params: {
                                  attendanceQuery:
                                    pilgrim.mobileNumber ||
                                    pilgrim.nationalId ||
                                    "",
                                  attendanceRequestId: String(Date.now()),
                                },
                              })
                            }
                          />
                          <PrimaryButton
                            label="برنامه غذایی"
                            icon="restaurant-outline"
                            variant="secondary"
                            style={styles.itemAction}
                            labelStyle={styles.itemActionLabel}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/meals",
                                params: {
                                  mealsView: "search",
                                  mealsQuery: pilgrim.mobileNumber || "",
                                  mealsRequestId: String(Date.now()),
                                },
                              })
                            }
                          />
                        </View>
                      </View>
                    }
                  />
                </View>
              ))
            )}
          </ScreenScroll>
        </>
      ) : (
        <ScreenScroll
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
        >
          <View style={styles.form}>
            <UserProfileForm value={form} onChange={setForm} />
          </View>
        </ScreenScroll>
      )}

      {showForm ? (
        <StickyBottomAction>
          <PrimaryButton
            label={editingPilgrimId ? "ذخیره تغییرات" : "ثبت زائر"}
            icon={editingPilgrimId ? "save-outline" : "checkmark"}
            loading={createMutation.isPending}
            compact
            onPress={() => createMutation.mutate()}
          />
        </StickyBottomAction>
      ) : null}
      <PilgrimFiltersModal
        visible={filterModalVisible}
        value={draftFilters}
        onChange={setDraftFilters}
        onClose={() => setFilterModalVisible(false)}
        onApply={applyFilters}
      />
      <NewReservationFab bottomOffset={showForm ? 72 : 0} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listToolbar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterButtonPressed: {
    opacity: 0.88,
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
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
  pilgrimItem: {
    marginBottom: 0,
  },
  emptyWrap: {
    gap: spacing.md,
    alignItems: "stretch",
  },
  itemActions: {
    gap: spacing.sm,
  },
  itemActionsRow: {
    direction: "ltr",
    flexDirection: "row",
    gap: spacing.sm,
  },
  itemAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
  },
  itemActionLabel: {
    fontSize: 10,
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
