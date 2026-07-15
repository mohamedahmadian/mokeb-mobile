import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { PersianDateField } from "@/src/components/PersianDateField";
import { AppInput, PrimaryButton } from "@/src/components/ui";
import { Text } from "@/src/lib/fonts";
import { createEmptyReservationFilterForm } from "@/src/lib/reservation-filters";
import { colors, formTypography, radius, spacing } from "@/src/lib/theme";
import type { ReservationFilterFormState } from "@/src/types";

type ReservationFiltersModalProps = {
  visible: boolean;
  value: ReservationFilterFormState;
  onChange: (value: ReservationFilterFormState) => void;
  onClose: () => void;
  onApply: () => void;
};

export function ReservationFiltersModal({
  visible,
  value,
  onChange,
  onClose,
  onApply,
}: ReservationFiltersModalProps) {
  const setField = <K extends keyof ReservationFilterFormState>(
    key: K,
    next: ReservationFilterFormState[K],
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleClear = () => {
    onChange(createEmptyReservationFilterForm());
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="بستن"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>فیلتر رزروها</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppInput
              label="نام و نام خانوادگی"
              value={value.pilgrimName}
              onChangeText={(text) => setField("pilgrimName", text)}
              placeholder="نام زائر"
            />
            <AppInput
              label="شناسه رزرو"
              value={value.trackingCode}
              onChangeText={(text) => setField("trackingCode", text)}
              placeholder="کد پیگیری رزرو"
            />
            <PersianDateField
              label="تاریخ ثبت"
              value={value.createdAtDate}
              onChange={(text) => setField("createdAtDate", text)}
              placeholder="انتخاب تاریخ ثبت"
            />
            <PersianDateField
              label="تاریخ شروع"
              value={value.startDate}
              onChange={(text) => setField("startDate", text)}
              placeholder="انتخاب تاریخ شروع"
            />
            <PersianDateField
              label="تاریخ پایان"
              value={value.endDate}
              onChange={(text) => setField("endDate", text)}
              placeholder="انتخاب تاریخ پایان"
            />
            <AppInput
              label="توضیحات"
              value={value.description}
              onChangeText={(text) => setField("description", text)}
              placeholder="جستجو در توضیحات"
              multiline
            />
          </ScrollView>

          <View style={styles.actions}>
            <PrimaryButton
              label="پاک کردن"
              variant="secondary"
              compact
              style={styles.actionButton}
              onPress={handleClear}
            />
            <PrimaryButton
              label="اعمال فیلتر"
              icon="checkmark"
              compact
              style={styles.actionButton}
              onPress={onApply}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    paddingHorizontal: spacing.lg,
  },
  modal: {
    maxHeight: "88%",
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  title: {
    ...formTypography.heading,
    flex: 1,
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  actions: {
    direction: "ltr",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    flex: 1,
  },
});
