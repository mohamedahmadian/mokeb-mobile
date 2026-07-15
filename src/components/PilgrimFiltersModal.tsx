import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LocationFields } from "@/src/components/LocationFields";
import { CarPlateInput } from "@/src/components/CarPlateInput";
import { AppInput, PrimaryButton } from "@/src/components/ui";
import { Text } from "@/src/lib/fonts";
import {
  createEmptyPilgrimFilterForm,
  getPilgrimFilterPlate,
  setPilgrimFilterPlate,
} from "@/src/lib/pilgrim-filters";
import {
  colors,
  formTypography,
  radius,
  spacing,
  typography,
} from "@/src/lib/theme";
import type { PilgrimFilterFormState, UserGender } from "@/src/types";

type PilgrimFiltersModalProps = {
  visible: boolean;
  value: PilgrimFilterFormState;
  onChange: (value: PilgrimFilterFormState) => void;
  onClose: () => void;
  onApply: () => void;
};

export function PilgrimFiltersModal({
  visible,
  value,
  onChange,
  onClose,
  onApply,
}: PilgrimFiltersModalProps) {
  const setField = <K extends keyof PilgrimFilterFormState>(
    key: K,
    next: PilgrimFilterFormState[K],
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleClear = () => {
    onChange(createEmptyPilgrimFilterForm());
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
            <Text style={styles.title}>فیلتر زائرین</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppInput
              label="کشور"
              value={value.country}
              onChangeText={(text) => setField("country", text)}
              placeholder="مثلاً ایران"
            />
            <LocationFields
              province={value.province}
              city={value.city}
              onProvinceChange={(text) => {
                onChange({ ...value, province: text, city: "" });
              }}
              onCityChange={(text) => setField("city", text)}
            />
            <CarPlateInput
              label="پلاک"
              value={getPilgrimFilterPlate(value)}
              onChange={(plate) => onChange(setPilgrimFilterPlate(value, plate))}
            />
            <AppInput
              label="شماره گذرنامه"
              value={value.passportNumber}
              onChangeText={(text) => setField("passportNumber", text)}
            />
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>جنسیت</Text>
              </View>
              <View style={styles.genderRow}>
                {(
                  [
                    ["", "همه"],
                    ["Male", "مرد"],
                    ["Female", "زن"],
                  ] as const
                ).map(([gender, label]) => {
                  const selected = value.gender === gender;
                  return (
                    <Pressable
                      key={gender || "all"}
                      style={[
                        styles.genderButton,
                        selected && styles.genderButtonSelected,
                      ]}
                      onPress={() =>
                        setField("gender", gender as UserGender | "")
                      }
                    >
                      <Text
                        style={[
                          styles.genderText,
                          selected && styles.genderTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
  },
  field: {
    width: "100%",
    alignItems: "stretch",
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    width: "100%",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
    writingDirection: "rtl",
  },
  labelRow: {
    width: "100%",
    alignItems: "flex-end",
  },
  genderRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  genderButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  genderText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  genderTextSelected: {
    color: colors.primaryDark,
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
