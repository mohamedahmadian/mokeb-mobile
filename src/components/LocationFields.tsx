import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput } from "@/src/lib/fonts";
import {
  getIranCities,
  iranProvinces,
  type LocationOption,
} from "@/src/data/iranLocations";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

type SearchableSelectProps = {
  label: string;
  value: string;
  placeholder: string;
  options: LocationOption[];
  disabled?: boolean;
  onSelect: (value: string) => void;
};

function SearchableSelect({
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onSelect,
}: SearchableSelectProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.name.includes(normalizedQuery));
  }, [options, query]);

  const close = () => {
    setVisible(false);
    setQuery("");
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        style={({ pressed }) => [
          styles.select,
          disabled && styles.selectDisabled,
          pressed && !disabled && styles.selectPressed,
        ]}
        onPress={() => setVisible(true)}
      >
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.textSubtle : colors.primary}
        />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable style={styles.closeButton} onPress={close}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textSubtle} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={`جستجوی ${label}`}
              placeholderTextColor={colors.textSubtle}
              style={styles.searchInput}
              textAlign="right"
            />
          </View>
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.options}
            ListEmptyComponent={
              <Text style={styles.empty}>موردی پیدا نشد</Text>
            }
            renderItem={({ item }) => {
              const selected = item.name === value;
              return (
                <Pressable
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item.name);
                    close();
                  }}
                >
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  ) : (
                    <View style={styles.optionIconSpace} />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

type LocationFieldsProps = {
  province: string;
  city: string;
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
};

export function LocationFields({
  province,
  city,
  onProvinceChange,
  onCityChange,
}: LocationFieldsProps) {
  const cities = useMemo(() => getIranCities(province), [province]);

  return (
    <>
      <SearchableSelect
        label="استان"
        value={province}
        placeholder="انتخاب استان"
        options={iranProvinces}
        onSelect={(value) => {
          if (value !== province) onCityChange("");
          onProvinceChange(value);
        }}
      />
      <SearchableSelect
        label="شهر"
        value={city}
        placeholder={province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"}
        options={cities}
        disabled={!province}
        onSelect={onCityChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
    alignItems: "stretch",
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    alignSelf: "flex-end",
    maxWidth: "100%",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "right",
    writingDirection: "rtl",
  },
  labelRow: {
    width: "100%",
    alignItems: "flex-end",
  },
  select: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.7,
  },
  selectPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  value: {
    ...typography.body,
    flex: 1,
    width: "100%",
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  placeholder: {
    color: colors.textSubtle,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.subtitle,
    flex: 1,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  search: {
    flexDirection: "row-reverse",
    alignItems: "center",
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    ...typography.body,
    minHeight: 46,
    flex: 1,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  options: {
    alignItems: "stretch",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  option: {
    flexDirection: "row-reverse",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  optionIconSpace: {
    width: 20,
  },
  optionText: {
    ...typography.body,
    flex: 1,
    width: "100%",
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  optionTextSelected: {
    color: colors.primaryDark,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.xxl,
  },
});
