import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { PrimaryButton } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAppBackHandler } from "@/src/hooks/useAppBackHandler";
import { deliveredItemStatusLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import {
  listPendingDeliveredItemsByReservation,
  updateDeliveredItem,
} from "@/src/services/delivered-items";
import type { Reservation, ReservationDeliveredItem } from "@/src/types";

type PendingDeliveredItemsCheckoutModalProps = {
  visible: boolean;
  reservation: Reservation;
  onClose: () => void;
  onProceedCheckout: () => void;
};

function PendingItemRow({
  item,
  loading,
  onReceive,
}: {
  item: ReservationDeliveredItem;
  loading: boolean;
  onReceive: () => void;
}) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.itemMeta}>
          تعداد: {item.quantity.toLocaleString("fa-IR")} •{" "}
          {deliveredItemStatusLabel[item.status]}
        </Text>
        {item.description ? (
          <Text style={styles.itemDescription}>{item.description}</Text>
        ) : null}
      </View>
      <PrimaryButton
        label="دریافت"
        icon="arrow-down-circle-outline"
        compact
        loading={loading}
        style={styles.receiveButton}
        labelStyle={styles.receiveButtonLabel}
        onPress={onReceive}
      />
    </View>
  );
}

export function PendingDeliveredItemsCheckoutModal({
  visible,
  reservation,
  onClose,
  onProceedCheckout,
}: PendingDeliveredItemsCheckoutModalProps) {
  const { ownerId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useAppBackHandler(
    () => {
      onClose();
      return true;
    },
    visible,
  );

  const pendingQuery = useQuery({
    queryKey: ["delivered-items-pending", ownerId, reservation.id],
    enabled: visible && !!ownerId,
    queryFn: () =>
      listPendingDeliveredItemsByReservation(ownerId!, reservation.id),
  });

  const pendingItems = pendingQuery.data ?? [];
  const hasPendingItems = pendingItems.length > 0;

  const receiveMutation = useMutation({
    mutationFn: (item: ReservationDeliveredItem) =>
      updateDeliveredItem(ownerId!, item.id, {
        status: "ReceivedFromGuest",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivered-items-pending", ownerId, reservation.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["delivered-items", ownerId, reservation.id],
      });
      notify("موفق", "دریافت امانت ثبت شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const handleReceive = (item: ReservationDeliveredItem) => {
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

  const openDeliveredItems = () => {
    onClose();
    router.push({
      pathname: "/reservations/delivered-items",
      params: {
        reservationId: String(reservation.id),
        pilgrimName: reservation.pilgrimName ?? "",
        trackingCode: reservation.trackingCode,
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="briefcase-outline"
                size={24}
                color={colors.warning}
              />
            </View>
            <Text style={styles.title}>امانت‌های باز</Text>
            <Text style={styles.subtitle}>
              {reservation.pilgrimName ?? "زائر"} • {reservation.trackingCode}
            </Text>
            <Text style={styles.message}>
              قبل از ثبت خروج نهایی، وضعیت امانت‌های زیر را مشخص کنید.
            </Text>
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {pendingQuery.isLoading ? (
              <Text style={styles.loading}>در حال بارگذاری...</Text>
            ) : hasPendingItems ? (
              pendingItems.map((item) => (
                <PendingItemRow
                  key={item.id}
                  item={item}
                  loading={
                    receiveMutation.isPending &&
                    receiveMutation.variables?.id === item.id
                  }
                  onReceive={() => handleReceive(item)}
                />
              ))
            ) : (
              <View style={styles.resolvedBox}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={28}
                  color={colors.success}
                />
                <Text style={styles.resolvedText}>
                  همه امانت‌ها تعیین تکلیف شدند.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {hasPendingItems ? (
              <PrimaryButton
                label="مدیریت امانت‌ها"
                icon="briefcase-outline"
                variant="secondary"
                compact
                style={styles.actionButton}
                onPress={openDeliveredItems}
              />
            ) : (
              <PrimaryButton
                label="ادامه خروج نهایی"
                icon="exit-outline"
                variant="danger"
                compact
                style={styles.actionButton}
                onPress={() => {
                  onClose();
                  onProceedCheckout();
                }}
              />
            )}
            <PrimaryButton
              label="انصراف"
              variant="secondary"
              compact
              style={styles.actionButton}
              onPress={onClose}
            />
          </View>
        </View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    zIndex: -1,
  },
  modal: {
    maxHeight: "82%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warningLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
  },
  message: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
  listScroll: {
    maxHeight: 280,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  itemRow: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.label,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  itemMeta: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  itemDescription: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  receiveButton: {
    minHeight: 34,
    minWidth: 84,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
  },
  receiveButtonLabel: {
    fontSize: 11,
  },
  loading: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
  resolvedBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  resolvedText: {
    ...typography.body,
    color: colors.success,
    textAlign: "center",
    writingDirection: "rtl",
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    minHeight: 40,
  },
});
