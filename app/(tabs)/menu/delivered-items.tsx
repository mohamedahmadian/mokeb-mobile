import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
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

export default function DeliveredItemsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    reservationId?: string;
    pilgrimName?: string;
    trackingCode?: string;
  }>();

  const reservationId = Number(params.reservationId);
  const hasReservation =
    Number.isFinite(reservationId) && reservationId > 0;

  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["delivered-items", user?.id, reservationId],
    enabled: !!user && hasReservation,
    queryFn: () => listDeliveredItemsByReservation(user!.id, reservationId),
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
        return updateDeliveredItem(user!.id, editingItemId, {
          itemName: itemName.trim(),
          quantity: qty,
          description: description.trim(),
        });
      }

      return createDeliveredItem(user!.id, {
        reservationId,
        itemName: itemName.trim(),
        quantity: qty,
        description: description.trim() || undefined,
        status: "DeliveredToGuest",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", user?.id, reservationId],
      });
      notify(
        "موفق",
        editingItemId ? "امانت به‌روزرسانی شد" : "امانت ثبت شد",
      );
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const receiveMutation = useMutation({
    mutationFn: (item: ReservationDeliveredItem) =>
      updateDeliveredItem(user!.id, item.id, {
        status: "ReceivedFromGuest",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", user?.id, reservationId],
      });
      notify("موفق", "دریافت امانت ثبت شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDeliveredItem(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", user?.id, reservationId],
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

  const subtitleParts = [
    params.pilgrimName?.trim() || null,
    params.trackingCode?.trim() || null,
  ].filter(Boolean);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
                  badgeTextColor={
                    isReceived ? colors.success : colors.warning
                  }
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
                      value: formatPersianDateTime(item.receivedAt) || "ثبت نشده",
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
                      <PrimaryButton
                        label="حذف"
                        icon="trash-outline"
                        variant="danger"
                        compact
                        style={styles.itemAction}
                        labelStyle={styles.itemActionLabel}
                        onPress={() => handleDelete(item)}
                      />
                    </View>
                  }
                />
              </View>
            );
          })
        ) : null}
      </ScrollView>

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
          label="افزودن امانت"
          onPress={openNewItem}
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
