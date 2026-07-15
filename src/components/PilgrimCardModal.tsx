import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/src/lib/fonts";
import { PilgrimCard } from "@/src/components/PilgrimCard";
import { PrimaryButton } from "@/src/components/ui";
import { notify } from "@/src/lib/notify";
import { useAppBackHandler } from "@/src/hooks/useAppBackHandler";
import {
  downloadPilgrimCardImage,
  sharePilgrimCardImage,
} from "@/src/lib/pilgrim-card-share";
import type { PilgrimCardDetails } from "@/src/lib/reservation-track";
import { colors, spacing } from "@/src/lib/theme";

type PilgrimCardModalProps = {
  visible: boolean;
  details: PilgrimCardDetails | null;
  loading?: boolean;
  onClose: () => void;
};

export function PilgrimCardModal({
  visible,
  details,
  loading = false,
  onClose,
}: PilgrimCardModalProps) {
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [busyAction, setBusyAction] = useState<"download" | "share" | null>(
    null,
  );

  useAppBackHandler(
    () => {
      onClose();
      return true;
    },
    visible,
  );

  const handleDownload = async () => {
    if (!details) return;
    try {
      setBusyAction("download");
      await downloadPilgrimCardImage(cardRef, details.reservation.trackingCode);
      notify("موفق", "زائر کارت در گالری ذخیره شد");
    } catch (error) {
      notify(
        "خطا",
        error instanceof Error ? error.message : "خطای ناشناخته",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    if (!details) return;
    try {
      setBusyAction("share");
      await sharePilgrimCardImage(cardRef, details.reservation.trackingCode);
    } catch (error) {
      notify(
        "خطا",
        error instanceof Error ? error.message : "خطای ناشناخته",
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="بستن"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>زائر کارت</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : details ? (
            <View ref={cardRef} collapsable={false}>
              <PilgrimCard details={details} />
            </View>
          ) : (
            <Text style={styles.empty}>اطلاعات زائر کارت یافت نشد</Text>
          )}
        </ScrollView>

        {details ? (
          <View
            style={[
              styles.actions,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <PrimaryButton
              label="دانلود"
              icon="download-outline"
              variant="secondary"
              compact
              loading={busyAction === "download"}
              style={styles.actionButton}
              onPress={handleDownload}
            />
            <PrimaryButton
              label="اشتراک‌گذاری"
              icon="share-social-outline"
              compact
              loading={busyAction === "share"}
              style={styles.actionButton}
              onPress={handleShare}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xxl,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  actionButton: {
    flex: 1,
  },
});
