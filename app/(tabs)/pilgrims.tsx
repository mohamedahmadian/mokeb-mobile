import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  useInfiniteQuery,
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
  ToolbarIconButton,
} from "@/src/components/ui";
import { PilgrimFiltersModal } from "@/src/components/PilgrimFiltersModal";
import {
  createUserFormData,
  UserProfileForm,
  userFormToInput,
} from "@/src/components/UserProfileForm";
import { useAuth } from "@/src/contexts/AuthContext";
import type { AlertButton } from "@/src/contexts/NotifyContext";
import { useNotifyContext } from "@/src/contexts/NotifyContext";
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

const PILGRIMS_PAGE_SIZE = 20;

function getPilgrimsNextPageParam(
  lastPage: User[] | undefined,
  allPages: User[][] | undefined,
) {
  if (!Array.isArray(lastPage) || lastPage.length < PILGRIMS_PAGE_SIZE) {
    return undefined;
  }
  return (allPages?.length ?? 0) * PILGRIMS_PAGE_SIZE;
}

export default function PilgrimsScreen() {
  const { ownerId, canDelete } = useAuth();
  const { showActions } = useNotifyContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pilgrimAction, pilgrimRequestId, pilgrimId } = useLocalSearchParams<{
    pilgrimAction?: string;
    pilgrimRequestId?: string;
    pilgrimId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
      setSearchQuery("");
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

  const submitSearch = () => setSearchQuery(query.trim());

  const {
    data: pilgrimsPages,
    isLoading: isPilgrimsLoading,
    isFetching: isPilgrimsFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchPilgrims,
  } = useInfiniteQuery({
    queryKey: ["pilgrims", "infinite", ownerId, searchQuery, listFilters],
    enabled: !!ownerId && !showForm,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      if (!ownerId) return Promise.resolve([]);
      return listPilgrims(ownerId, {
        query: searchQuery || undefined,
        ...listFilters,
        limit: PILGRIMS_PAGE_SIZE,
        offset: pageParam,
      });
    },
    getNextPageParam: getPilgrimsNextPageParam,
  });

  const pilgrims = useMemo(
    () => pilgrimsPages?.pages.flatMap((page) => page ?? []) ?? [],
    [pilgrimsPages],
  );

  const loadingMoreRef = useRef(false);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasNextPage || isFetchingNextPage || loadingMoreRef.current) return;

      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromBottom < 160) {
        loadingMoreRef.current = true;
        void fetchNextPage().finally(() => {
          loadingMoreRef.current = false;
        });
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

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

  const showPilgrimActions = (pilgrim: User) => {
    const buttons: AlertButton[] = [
      {
        text: "تاریخچه رزروها",
        onPress: () =>
          router.push({
            pathname: "/(tabs)/reservations",
            params: {
              reservationAction: "history",
              pilgrimMobile: pilgrim.mobileNumber,
              pilgrimName: pilgrim.fullName,
              reservationRequestId: String(Date.now()),
            },
          }),
      },
      {
        text: "رزرو",
        onPress: () =>
          router.push({
            pathname: "/(tabs)/reservations",
            params: {
              pilgrimId: String(pilgrim.id),
              pilgrimName: pilgrim.fullName,
              pilgrimMobile: pilgrim.mobileNumber,
              pilgrimGender: pilgrim.gender ?? "",
              reservationRequestId: String(Date.now()),
            },
          }),
      },
      {
        text: "ورود و خروج",
        onPress: () =>
          router.push({
            pathname: "/(tabs)/attendance",
            params: {
              attendanceQuery:
                pilgrim.mobileNumber || pilgrim.nationalId || "",
              attendanceRequestId: String(Date.now()),
            },
          }),
      },
      {
        text: "برنامه غذایی",
        onPress: () =>
          router.push({
            pathname: "/(tabs)/meals",
            params: {
              mealsView: "search",
              mealsQuery: pilgrim.mobileNumber || "",
              mealsRequestId: String(Date.now()),
            },
          }),
      },
    ];

    if (canDelete) {
      buttons.push({
        text: "حذف",
        style: "destructive",
        onPress: () => handleDeletePilgrim(pilgrim),
      });
    }

    buttons.push({ text: "انصراف", style: "cancel" });

    showActions({
      title: pilgrim.fullName,
      message: "سایر عملیات",
      buttons,
    });
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
        leftAction={
          !showForm ? (
            <ToolbarIconButton
              icon="options-outline"
              onPress={openFilterModal}
              accessibilityLabel="فیلتر زائرین"
              active={hasFilters}
              showBadge={hasFilters}
            />
          ) : undefined
        }
      />

      {!showForm ? (
        <>
          <View style={styles.listToolbar}>
            <SearchToolbar>
              <SearchToolbarField>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="نام، موبایل یا کد ملی"
                  autoFocus
                  embedded
                  onSearchPress={submitSearch}
                />
              </SearchToolbarField>
              <ToolbarIconButton
                icon="add"
                onPress={openNewPilgrim}
                accessibilityLabel="زائر جدید"
              />
            </SearchToolbar>
          </View>

          <ScreenScroll
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            onScroll={handleListScroll}
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
            {isPilgrimsLoading && pilgrims.length === 0 ? (
              <Text style={styles.loading}>در حال بارگذاری...</Text>
            ) : pilgrims.length === 0 && !isPilgrimsFetching ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="people-outline"
                  title={
                    hasFilters || searchQuery
                      ? "زائری با این مشخصات یافت نشد"
                      : "زائری جهت نمایش وجود ندارد"
                  }
                />
                {!hasFilters && !searchQuery ? (
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
                      <View style={styles.itemActionsBar}>
                        <Pressable
                          onPress={() => showPilgrimActions(pilgrim)}
                          style={({ pressed }) => [
                            styles.moreButton,
                            pressed && styles.moreButtonPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="سایر عملیات"
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={20}
                            color={colors.textMuted}
                          />
                        </Pressable>
                        <PrimaryButton
                          label="ویرایش"
                          icon="create-outline"
                          variant="secondary"
                          compact
                          style={styles.itemActionPrimary}
                          labelStyle={styles.itemActionLabel}
                          onPress={() => openEditPilgrim(pilgrim)}
                        />
                      </View>
                    }
                  />
                </View>
              ))
            )}
            {isFetchingNextPage ? (
              <View style={styles.listFooterLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.listFooterLoadingText}>
                  در حال بارگذاری...
                </Text>
              </View>
            ) : null}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listToolbar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  itemActionsBar: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  moreButton: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  moreButtonPressed: {
    opacity: 0.85,
    backgroundColor: colors.borderLight,
  },
  itemActionPrimary: {
    minWidth: 96,
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
  listFooterLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  listFooterLoadingText: {
    color: colors.textMuted,
    fontSize: 13,
    writingDirection: "rtl",
  },
});
