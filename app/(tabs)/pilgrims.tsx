import { useEffect, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { ListTotalCounter } from "@/src/components/ListTotalCounter";
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
import {
  createUserFormData,
  UserProfileForm,
  userFormToInput,
} from "@/src/components/UserProfileForm";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { genderLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { colors, spacing } from "@/src/lib/theme";
import {
  countPilgrims,
  createPilgrim,
  listPilgrims,
  updatePilgrim,
} from "@/src/services/pilgrims";
import type { User } from "@/src/types";

export default function PilgrimsScreen() {
  const { user, ownerId } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pilgrimAction, pilgrimRequestId } = useLocalSearchParams<{
    pilgrimAction?: string;
    pilgrimRequestId?: string;
  }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => createUserFormData());
  const [editingPilgrimId, setEditingPilgrimId] = useState<number | null>(null);

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
    }
  }, [pilgrimAction, pilgrimRequestId]);

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
    queryKey: ["pilgrims", ownerId, debouncedQuery],
    enabled: !!ownerId,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listPilgrims(ownerId!, {
        query: debouncedQuery || undefined,
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

  return (
    <ScreenContainer>
      <AppHeader
        title={
          showForm ? (editingPilgrimId ? "ویرایش زائر" : "زائر جدید") : "زائرین"
        }
        subtitle={showForm ? undefined : "مدیریت و جستجوی زائر"}
        onBack={showForm ? closeForm : undefined}
        showLogo={!showForm}
      />

      {!showForm ? (
        <>
          <View style={styles.listToolbar}>
            <SearchToolbar>
              <ListTotalCounter
                label="زائر"
                count={totalPilgrims}
                icon="people"
                accent="#0284c7"
                accentSoft="#e0f2fe"
              />
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
                  title="زائری جهت نمایش وجود ندارد"
                />
                <PrimaryButton
                  label="زائر جدید"
                  icon="person-add-outline"
                  compact
                  onPress={openNewPilgrim}
                />
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
                              text: `کد ملی: ${pilgrim.nationalId}`,
                            },
                          ]
                        : []),
                      ...(pilgrim.gender
                        ? [
                            {
                              icon: "male-female-outline" as const,
                              text: `جنسیت: ${genderLabel[pilgrim.gender]}`,
                            },
                          ]
                        : []),
                      ...(pilgrim.city
                        ? [
                            {
                              icon: "location-outline" as const,
                              text: `شهر: ${pilgrim.city}`,
                            },
                          ]
                        : []),
                    ]}
                    footer={
                      <View style={styles.itemActions}>
                        <PrimaryButton
                          label="ویرایش"
                          icon="create-outline"
                          variant="secondary"
                          style={styles.itemAction}
                          labelStyle={styles.itemActionLabel}
                          onPress={() => openEditPilgrim(pilgrim)}
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
