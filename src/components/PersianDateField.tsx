import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { jalaaliMonthLength } from "jalaali-js";
import { Text } from "@/src/lib/fonts";
import { fontFamilies } from "@/src/lib/fonts";
import { useAppBackHandler } from "@/src/hooks/useAppBackHandler";
import { useBottomSheetPadding } from "@/src/hooks/useBottomSheetInsets";
import {
  buildPersianDate,
  formatPersianDate,
  formatPersianDateParts,
  formatPersianNumber,
  persianMonthNames,
} from "@/src/lib/persianDate";
import { colors, formTypography, radius, spacing } from "@/src/lib/theme";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const MONTHS = persianMonthNames();

type PersianDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  /** اولین سال قابل انتخاب (شمسی) */
  yearFrom?: number;
  /** آخرین سال قابل انتخاب (شمسی) */
  yearTo?: number;
};

function todayParts() {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const persian = formatPersianDate(iso);
  return formatPersianDateParts(persian) ?? { jy: 1404, jm: 1, jd: 1 };
}

function clampDay(jy: number, jm: number, jd: number) {
  const max = jalaaliMonthLength(jy, jm);
  return Math.min(Math.max(1, jd), max);
}

function WheelColumn({
  items,
  selectedIndex,
  onChangeIndex,
}: {
  items: { key: string | number; label: string }[];
  selectedIndex: number;
  onChangeIndex: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const padding = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

  useEffect(() => {
    const y = Math.max(0, selectedIndex) * ITEM_HEIGHT;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [selectedIndex, items.length]);

  const snapToNearest = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onChangeIndex(clamped);
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.wheelColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={snapToNearest}
        onScrollEndDrag={snapToNearest}
        contentContainerStyle={{ paddingVertical: padding }}
      >
        {items.map((item, index) => {
          const active = index === selectedIndex;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                onChangeIndex(index);
                scrollRef.current?.scrollTo({
                  y: index * ITEM_HEIGHT,
                  animated: true,
                });
              }}
              style={styles.wheelItem}
            >
              <Text
                style={[
                  styles.wheelItemLabel,
                  active && styles.wheelItemLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={styles.wheelHighlight} />
    </View>
  );
}

export function PersianDateField({
  label,
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  required = false,
  error,
  yearFrom,
  yearTo,
}: PersianDateFieldProps) {
  const [open, setOpen] = useState(false);
  const bottomPadding = useBottomSheetPadding();
  const initial = formatPersianDateParts(value) ?? todayParts();
  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);
  const [jd, setJd] = useState(initial.jd);

  useAppBackHandler(
    () => {
      setOpen(false);
      return true;
    },
    open,
  );

  const yearItems = useMemo(() => {
    const center = todayParts().jy;
    const from = yearFrom ?? center - 100;
    const to = yearTo ?? center + 5;
    const years: { key: number; label: string }[] = [];
    for (let y = from; y <= to; y += 1) {
      years.push({ key: y, label: formatPersianNumber(y) });
    }
    return years;
  }, [yearFrom, yearTo]);

  const monthItems = useMemo(
    () =>
      MONTHS.map((name, index) => ({
        key: index + 1,
        label: name,
      })),
    [],
  );

  const dayItems = useMemo(() => {
    const length = jalaaliMonthLength(jy, jm);
    return Array.from({ length }, (_, i) => {
      const day = i + 1;
      return { key: day, label: formatPersianNumber(day) };
    });
  }, [jy, jm]);

  const openPicker = () => {
    const parts = formatPersianDateParts(value) ?? todayParts();
    setJy(parts.jy);
    setJm(parts.jm);
    setJd(clampDay(parts.jy, parts.jm, parts.jd));
    setOpen(true);
  };

  const confirm = () => {
    const nextJd = clampDay(jy, jm, jd);
    const next = buildPersianDate(jy, jm, nextJd);
    if (next) onChange(next);
    setOpen(false);
  };

  const yearIndex = Math.max(
    0,
    yearItems.findIndex((item) => item.key === jy),
  );
  const monthIndex = Math.max(0, jm - 1);
  const dayIndex = Math.max(0, Math.min(dayItems.length - 1, jd - 1));

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        {required ? <Text style={styles.requiredMark}>*</Text> : null}
        <Text style={styles.label}>{label}</Text>
      </View>

      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.input,
          error ? styles.inputError : null,
          pressed && styles.inputPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text
          style={[styles.valueText, !value && styles.placeholderText]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
            <Text style={styles.sheetTitle}>{label}</Text>

            <View style={styles.wheels}>
              <WheelColumn
                items={dayItems}
                selectedIndex={dayIndex}
                onChangeIndex={(index) => setJd(index + 1)}
              />
              <WheelColumn
                items={monthItems}
                selectedIndex={monthIndex}
                onChangeIndex={(index) => {
                  const nextMonth = index + 1;
                  setJm(nextMonth);
                  setJd((prev) => clampDay(jy, nextMonth, prev));
                }}
              />
              <WheelColumn
                items={yearItems}
                selectedIndex={yearIndex >= 0 ? yearIndex : 0}
                onChangeIndex={(index) => {
                  const nextYear = yearItems[index]?.key ?? jy;
                  setJy(nextYear);
                  setJd((prev) => clampDay(nextYear, jm, prev));
                }}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.actionBtn, styles.actionSecondary]}
              >
                <Text style={styles.actionSecondaryText}>انصراف</Text>
              </Pressable>
              <Pressable
                onPress={confirm}
                style={[styles.actionBtn, styles.actionPrimary]}
              >
                <Text style={styles.actionPrimaryText}>تأیید</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  label: {
    ...formTypography.label,
    color: colors.textMuted,
  },
  requiredMark: {
    color: colors.danger,
    fontFamily: fontFamilies.bold,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  inputError: {
    borderColor: colors.danger,
  },
  valueText: {
    ...formTypography.body,
    flex: 1,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  placeholderText: {
    color: colors.textSubtle,
  },
  error: {
    ...formTypography.caption,
    color: colors.danger,
    textAlign: "right",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  wheels: {
    flexDirection: "row-reverse",
    height: PICKER_HEIGHT,
    gap: spacing.sm,
  },
  wheelColumn: {
    flex: 1,
    height: PICKER_HEIGHT,
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  wheelItemLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
  },
  wheelItemLabelActive: {
    fontFamily: fontFamilies.bold,
    color: colors.primaryDark,
    fontSize: 16,
  },
  wheelHighlight: {
    position: "absolute",
    left: 4,
    right: 4,
    top: ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  actions: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionPrimaryText: {
    fontFamily: fontFamilies.medium,
    color: "#fff",
    fontSize: 14,
  },
  actionSecondary: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionSecondaryText: {
    fontFamily: fontFamilies.medium,
    color: colors.text,
    fontSize: 14,
  },
});
