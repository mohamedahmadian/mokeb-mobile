import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  EmptyState,
  FloatingActionButton,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  SearchBar,
  SearchBarStickyWrap,
  StickyBottomAction,
} from "@/src/components/ui";
import {
  createUserFormData,
  UserProfileForm,
  userFormToInput,
} from "@/src/components/UserProfileForm";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { genderLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { colors, spacing } from "@/src/lib/theme";
import {
  createPilgrim,
  listPilgrims,
  updatePilgrim,
} from "@/src/services/pilgrims";
import type { User } from "@/src/types";

export default function PilgrimsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
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

  const openEditPilgrim = (pilgrim: User) => {
    setEditingPilgrimId(pilgrim.id);
    setForm(createUserFormData(pilgrim));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const { data: pilgrims = [], isLoading, isFetching } = useQuery({
    queryKey: ["pilgrims", user?.id, debouncedQuery],
    enabled: !!user,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listPilgrims(user!.id, {
        fullName: debouncedQuery || undefined,
        mobileNumber: debouncedQuery || undefined,
        nationalId: debouncedQuery || undefined,
      }),
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
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  return (
    <ScreenContainer>
      <AppHeader
        title={
          showForm
            ? editingPilgrimId
              ? "ویرایش زائر"
              : "زائر جدید"
            : "زائرین"
        }
        subtitle={showForm ? undefined : "مدیریت و جستجوی زائر"}
        onBack={showForm ? closeForm : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={!showForm ? [0] : undefined}
      >
        {!showForm ? (
          <SearchBarStickyWrap>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="نام، موبایل یا کد ملی"
            />
          </SearchBarStickyWrap>
        ) : null}
        {showForm ? (
          <View style={styles.form}>
            <UserProfileForm value={form} onChange={setForm} />
          </View>
        ) : null}

        {!showForm && isLoading && pilgrims.length === 0 ? (
          <Text style={styles.loading}>در حال بارگذاری...</Text>
        ) : !showForm && pilgrims.length === 0 && !isFetching ? (
          <EmptyState
            icon="people-outline"
            title="زائری ثبت نشده"
            description="برای شروع، یک زائر جدید اضافه کنید."
          />
        ) : !showForm ? (
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
                              pilgrim.mobileNumber || pilgrim.nationalId || "",
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
        ) : null}
      </ScrollView>
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
      ) : (
        <FloatingActionButton
          label="زائر جدید"
          onPress={openNewPilgrim}
        />
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
  pilgrimItem: {
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
