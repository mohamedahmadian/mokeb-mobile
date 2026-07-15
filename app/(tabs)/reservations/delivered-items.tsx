import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import {
  AppInput,
  EmptyState,
  FloatingActionButton,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
  StickyBottomAction,
} from "@/src/components/ui";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { notify } from "@/src/lib/notify";
import { formatPersianDateTime } from "@/src/lib/format-time";
import { deliveredItemStatusLabel } from "@/src/lib/labels";
import { colors, spacing } from "@/src/lib/theme";
import {
  createDeliveredItem,
  deleteDeliveredItem,
  listDeliveredItemsByReservation,
  updateDeliveredItem,
} from "@/src/services/delivered-items";
import type { ReservationDeliveredItem } from "@/src/types";

function paramString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function DeliveredItemsScreen() {
  const { ownerId, canDelete } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    reservationId?: string | string[];
    pilgrimName?: string | string[];
    trackingCode?: string | string[];
  }>();

  const reservationId = Number(paramString(params.reservationId));
  const hasReservation = Number.isFinite(reservationId) && reservationId > 0;
  const pilgrimName = paramString(params.pilgrimName)?.trim();
  const trackingCode = paramString(params.trackingCode)?.trim();

  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");

  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["delivered-items", ownerId, reservationId],
    enabled: !!ownerId && hasReservation,
    queryFn: () => listDeliveredItemsByReservation(ownerId!, reservationId),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await refetch();
  });

  const resetForm = () => {
    setEditingItemId(null);
    setItemName("");
    setQuantity("1");
    setDescription("");
  };

  const openNewItem = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditItem = (item: ReservationDeliveredItem) => {
    setEditingItemId(item.id);
    setItemName(item.itemName);
    setQuantity(String(item.quantity));
    setDescription(item.description ?? "");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!hasReservation) throw new Error("رزرو مشخص نشده است");
      const qty = Number(quantity);
      if (!itemName.trim()) throw new Error("نام امانت را وارد کنید");
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error("تعداد باید بیشتر از صفر باشد");
      }

      if (editingItemId) {
        return updateDeliveredItem(ownerId!, editingItemId, {
          itemName: itemName.trim(),
          quantity: qty,
          description: description.trim(),
        });
      }

      return createDeliveredItem(ownerId!, {
        reservationId,
        itemName: itemName.trim(),
        quantity: qty,
        description: description.trim() || undefined,
        status: "DeliveredToGuest",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", ownerId, reservationId],
      });
      notify("موفق", editingItemId ? "امانت به‌روزرسانی شد" : "امانت ثبت شد");
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const receiveMutation = useMutation({
    mutationFn: (item: ReservationDeliveredItem) =>
      updateDeliveredItem(ownerId!, item.id, {
        status: "ReceivedFromGuest",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", ownerId, reservationId],
      });
      notify("موفق", "دریافت امانت ثبت شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDeliveredItem(ownerId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", ownerId, reservationId],
      });
      notify("موفق", "امانت حذف شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const handleReceive = (item: ReservationDeliveredItem) => {
    if (item.status === "ReceivedFromGuest") {
      notify("توجه", "این امانت قبلاً دریافت شده است");
      return;
    }
    notify(
      "ثبت دریافت",
      `آیا دریافت «${item.itemName}» از زائر را تأیید می‌کنید؟`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "دریافت",
          onPress: () => receiveMutation.mutate(item),
        },
      ],
    );
  };

  const handleDelete = (item: ReservationDeliveredItem) => {
    notify("حذف امانت", `آیا از حذف «${item.itemName}» مطمئن هستید؟`, [
      { text: "انصراف", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const subtitleParts = [pilgrimName || null, trackingCode || null].filter(
    Boolean,
  );

  if (!hasReservation) {
    return (
      <ScreenContainer>
        <AppHeader
          title="امانت‌ها"
          subtitle="امانت‌ها وابسته به رزرو هستند"
          onBack={() => router.back()}
        />
        <EmptyState
          icon="briefcase-outline"
          title="رزرو انتخاب نشده"
          description="از لیست رزروها روی دکمه «امانت» بزنید."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader
        title={
          showForm
            ? editingItemId
              ? "ویرایش امانت"
              : "افزودن امانت"
            : "امانت‌ها"
        }
        subtitle={
          showForm
            ? undefined
            : subtitleParts.length
              ? subtitleParts.join(" • ")
              : "مدیریت امانات این رزرو"
        }
        onBack={showForm ? closeForm : () => router.back()}
      />

      <ScreenScroll
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            <AppInput
              label="نام امانت"
              value={itemName}
              onChangeText={setItemName}
            />
            <AppInput
              label="تعداد"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
            <AppInput
              label="توضیحات"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        ) : null}

        {!showForm && isLoading ? (
          <Text style={styles.loading}>در حال بارگذاری...</Text>
        ) : !showForm && items.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="امانتی ثبت نشده"
            description="امانت تحویلی به زائر این رزرو را اضافه کنید."
          />
        ) : !showForm ? (
          items.map((item) => {
            const isReceived = item.status === "ReceivedFromGuest";
            return (
              <View key={item.id} style={styles.itemWrap}>
                <ListCard
                  title={item.itemName}
                  titleIcon="briefcase-outline"
                  badge={deliveredItemStatusLabel[item.status]}
                  badgeColor={
                    isReceived ? colors.successLight : colors.warningLight
                  }
                  badgeTextColor={isReceived ? colors.success : colors.warning}
                  details={[
                    {
                      icon: "layers-outline",
                      label: "تعداد",
                      value: item.quantity.toLocaleString("fa-IR"),
                    },
                    ...(item.description
                      ? [
                          {
                            icon: "document-text-outline" as const,
                            label: "توضیحات",
                            value: item.description,
                          },
                        ]
                      : []),
                    {
                      icon: "calendar-outline",
                      label: "تاریخ ثبت",
                      value: formatPersianDateTime(item.createdAt) || "—",
                    },
                    {
                      icon: "time-outline",
                      label: "تاریخ دریافت",
                      value:
                        formatPersianDateTime(item.receivedAt) || "ثبت نشده",
                    },
                    {
                      icon: "person-outline",
                      text: `ثبت‌کننده: ${item.recordedByName ?? "—"}`,
                    },
                  ]}
                  footer={
                    <View style={styles.itemActions}>
                      <PrimaryButton
                        label="ویرایش"
                        icon="create-outline"
                        variant="secondary"
                        compact
                        style={styles.itemAction}
                        labelStyle={styles.itemActionLabel}
                        onPress={() => openEditItem(item)}
                      />
                      <PrimaryButton
                        label={isReceived ? "دریافت شده" : "دریافت"}
                        icon={
                          isReceived
                            ? "checkmark-circle-outline"
                            : "arrow-down-circle-outline"
                        }
                        variant={isReceived ? "secondary" : "primary"}
                        compact
                        disabled={isReceived}
                        loading={
                          receiveMutation.isPending &&
                          receiveMutation.variables?.id === item.id
                        }
                        style={styles.itemAction}
                        labelStyle={styles.itemActionLabel}
                        onPress={() => handleReceive(item)}
                      />
                      {canDelete ? (
                        <PrimaryButton
                          label="حذف"
                          icon="trash-outline"
                          variant="danger"
                          compact
                          style={styles.itemAction}
                          labelStyle={styles.itemActionLabel}
                          onPress={() => handleDelete(item)}
                        />
                      ) : null}
                    </View>
                  }
                />
              </View>
            );
          })
        ) : null}
      </ScreenScroll>

      {showForm ? (
        <StickyBottomAction>
          <PrimaryButton
            label={editingItemId ? "ذخیره تغییرات" : "ثبت امانت"}
            icon={editingItemId ? "save-outline" : "checkmark"}
            loading={saveMutation.isPending}
            compact
            onPress={() => saveMutation.mutate()}
          />
        </StickyBottomAction>
      ) : (
        <FloatingActionButton
          label="افزودن امانتی"
          tooltip="افزودن امانتی"
          onPress={openNewItem}
        />
      )}
      <NewReservationFab bottomOffset={showForm ? 72 : 0} />
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
  form: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemWrap: {
    marginBottom: 0,
  },
  itemActions: {
    direction: "ltr",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemAction: {
    flexGrow: 1,
    flexBasis: "30%",
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
