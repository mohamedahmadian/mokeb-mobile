import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  IRAN_PLATE_LETTERS,
  combinePlateSerial,
  normalizeCarPlateValue,
  normalizeDigits,
  splitPlateSerial,
  type CarPlateValue,
} from "@/src/lib/carPlate";
import { colors, formTypography, radius, spacing } from "@/src/lib/theme";

type CarPlateInputProps = {
  label?: string;
  value: CarPlateValue;
  onChange: (value: CarPlateValue) => void;
  onFocus?: TextInputProps["onFocus"];
  compact?: boolean;
};

export function CarPlateInput({
  label = "پلاک خودرو",
  value,
  onChange,
  onFocus,
  compact = false,
}: CarPlateInputProps) {
  const normalized = normalizeCarPlateValue(value);
  const { letter, digits } = splitPlateSerial(normalized.plateSerial);
  const [letterPickerVisible, setLetterPickerVisible] = useState(false);

  const update = (next: Partial<CarPlateValue>) => {
    onChange(normalizeCarPlateValue({ ...normalized, ...next }));
  };

  const updateSerial = (nextLetter: string, nextDigits: string) => {
    update({ plateSerial: combinePlateSerial(nextLetter, nextDigits) });
  };

  const letterColumns = useMemo(() => {
    const columns: string[][] = [[], [], [], []];
    IRAN_PLATE_LETTERS.forEach((item, index) => {
      columns[index % 4].push(item);
    });
    return columns;
  }, []);

  return (
    <View style={styles.field}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}

      <View style={[styles.plate, compact && styles.plateCompact]}>
        <View style={styles.segmentPrefix}>
          <TextInput
            value={normalized.plateTwoDigit}
            onChangeText={(text) =>
              update({ plateTwoDigit: normalizeDigits(text, 2) })
            }
            keyboardType="number-pad"
            maxLength={2}
            placeholder="۱۱"
            placeholderTextColor={colors.textSubtle}
            style={[styles.segmentInput, styles.prefixInput]}
            textAlign="center"
            onFocus={onFocus}
          />
        </View>

        <View style={styles.segmentDivider} />

        <View style={styles.segmentLetter}>
          <Pressable
            style={({ pressed }) => [
              styles.letterButton,
              pressed && styles.letterButtonPressed,
            ]}
            onPress={() => setLetterPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="انتخاب حرف پلاک"
          >
            <Text
              style={[styles.segmentText, !letter && styles.placeholderText]}
            >
              {letter || "حرف"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.segmentDivider} />

        <View style={styles.segmentSerial}>
          <TextInput
            value={digits}
            onChangeText={(text) =>
              updateSerial(letter, normalizeDigits(text, 3))
            }
            keyboardType="number-pad"
            maxLength={3}
            placeholder="۱۱۱"
            placeholderTextColor={colors.textSubtle}
            style={[styles.segmentInput, styles.serialInput]}
            textAlign="center"
            onFocus={onFocus}
          />
        </View>

        <View style={styles.segmentDivider} />

        <View style={styles.segmentProvince}>
          <Text style={styles.iranLabel}>ایران</Text>
          <TextInput
            value={normalized.plateProvince}
            onChangeText={(text) =>
              update({ plateProvince: normalizeDigits(text, 2) })
            }
            keyboardType="number-pad"
            maxLength={2}
            placeholder="۳۶"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={[styles.segmentInput, styles.provinceInput]}
            textAlign="center"
            onFocus={onFocus}
          />
        </View>
      </View>

      <Modal
        visible={letterPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setLetterPickerVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setLetterPickerVisible(false)}
        >
          <Pressable style={styles.pickerCard} onPress={() => undefined}>
            <Text style={styles.pickerTitle}>انتخاب حرف پلاک</Text>
            <ScrollView
              contentContainerStyle={styles.pickerGrid}
              keyboardShouldPersistTaps="handled"
            >
              {letterColumns.map((column, columnIndex) => (
                <View key={columnIndex} style={styles.pickerColumn}>
                  {column.map((item) => {
                    const selected = letter === item;
                    return (
                      <Pressable
                        key={item}
                        style={[
                          styles.pickerItem,
                          selected && styles.pickerItemSelected,
                        ]}
                        onPress={() => {
                          updateSerial(item, digits);
                          setLetterPickerVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            selected && styles.pickerItemTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  label: {
    ...formTypography.label,
    color: colors.text,
  },
  plate: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1.5,
    borderColor: "#1e293b",
    borderRadius: radius.md,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    minHeight: 56,
  },
  plateCompact: {
    minHeight: 50,
  },
  segmentPrefix: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: spacing.xs,
  },
  segmentLetter: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  segmentSerial: {
    flex: 1,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  segmentProvince: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003399",
    paddingVertical: spacing.xs,
    gap: 2,
  },
  segmentDivider: {
    width: 1,
    backgroundColor: "#1e293b",
  },
  iranLabel: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  segmentInput: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
    minWidth: 36,
  },
  prefixInput: {
    width: "100%",
  },
  serialInput: {
    width: "100%",
  },
  provinceInput: {
    color: "#ffffff",
    width: "100%",
  },
  letterButton: {
    width: "100%",
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  letterButtonPressed: {
    opacity: 0.85,
  },
  segmentText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  placeholderText: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: "600",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  pickerTitle: {
    ...formTypography.heading,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  pickerGrid: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pickerColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  pickerItem: {
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  pickerItemTextSelected: {
    color: colors.primaryDark,
  },
});
