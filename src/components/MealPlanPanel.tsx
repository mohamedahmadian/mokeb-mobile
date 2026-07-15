import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { mealTypeLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { formatPersianDate } from "@/src/lib/persianDate";
import { colors, formTypography, radius, spacing } from "@/src/lib/theme";
import { groupMealPlansByDate } from "@/src/services/meals";
import type { MealPlan } from "@/src/types";

type MealPlanPanelProps = {
  meals: MealPlan[];
  loading?: boolean;
  busyMealId?: number | null;
  onToggleRequired: (meal: MealPlan, isRequired: boolean) => void;
  onUpdateGuestCount: (meal: MealPlan, guestCount: number) => void;
  onToggleServed: (meal: MealPlan, isServed: boolean, guestCount: number) => void;
};

function parseGuestCountInput(value: string): number | null {
  const normalized = value.replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
  );
  const parsed = Number(normalized.trim());
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

export function MealPlanPanel({
  meals,
  loading = false,
  busyMealId = null,
  onToggleRequired,
  onUpdateGuestCount,
  onToggleServed,
}: MealPlanPanelProps) {
  const days = groupMealPlansByDate(meals);
  const [guestCounts, setGuestCounts] = useState<Record<number, string>>({});
  const skipBlurCommitRef = useRef<number | null>(null);

  useEffect(() => {
    setGuestCounts((current) => {
      const next = { ...current };
      for (const meal of meals) {
        if (!(meal.id in next) || meal.isServed) {
          next[meal.id] = String(meal.guestCount);
        }
      }
      return next;
    });
  }, [meals]);

  if (loading) {
    return <Text style={styles.loading}>در حال بارگذاری برنامه غذایی...</Text>;
  }

  if (!days.length) {
    return (
      <View style={styles.empty}>
        <Ionicons
          name="restaurant-outline"
          size={22}
          color={colors.textSubtle}
        />
        <Text style={styles.emptyTitle}>برنامه غذایی ثبت نشده</Text>
        <Text style={styles.emptyText}>
          برای ساخت برنامه، روی «ایجاد برنامه غذایی» بزنید.
        </Text>
      </View>
    );
  }

  const commitGuestCount = (meal: MealPlan) => {
    if (skipBlurCommitRef.current === meal.id) {
      skipBlurCommitRef.current = null;
      return;
    }

    const parsed = parseGuestCountInput(guestCounts[meal.id] ?? "");
    if (parsed == null) {
      setGuestCounts((current) => ({
        ...current,
        [meal.id]: String(meal.guestCount),
      }));
      return;
    }
    if (parsed !== meal.guestCount) {
      onUpdateGuestCount(meal, parsed);
    }
  };

  const handleServe = (meal: MealPlan) => {
    if (meal.isServed) {
      onToggleServed(meal, false, meal.guestCount);
      return;
    }

    const parsed = parseGuestCountInput(guestCounts[meal.id] ?? "");
    if (parsed == null) {
      notify("خطا", "تعداد نفرات باید حداقل ۱ باشد");
      return;
    }
    onToggleServed(meal, true, parsed);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>برنامه غذایی</Text>
      {days.map(({ date, meals: dayMeals }) => (
        <View key={date} style={styles.dayCard}>
          <Text style={styles.dayTitle}>{formatPersianDate(date)}</Text>
          {dayMeals.map((meal) => {
            const busy = busyMealId === meal.id;
            const countDisabled = !meal.isRequired || meal.isServed || busy;
            const countValue =
              guestCounts[meal.id] ?? String(meal.guestCount);

            return (
              <View key={meal.id} style={styles.mealRow}>
                <Pressable
                  style={styles.checkboxRow}
                  disabled={busy}
                  onPress={() => onToggleRequired(meal, !meal.isRequired)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: meal.isRequired }}
                >
                  <Ionicons
                    name={meal.isRequired ? "checkbox" : "square-outline"}
                    size={22}
                    color={
                      meal.isRequired ? colors.primary : colors.textSubtle
                    }
                  />
                  <Text
                    style={[
                      styles.mealLabel,
                      !meal.isRequired && styles.mealLabelMuted,
                    ]}
                  >
                    {mealTypeLabel[meal.mealType]}
                  </Text>
                </Pressable>

                <View style={styles.countWrap}>
                  <Text style={styles.countLabel}>تعداد</Text>
                  <TextInput
                    style={[
                      styles.countInput,
                      countDisabled && styles.countInputDisabled,
                      meal.isServed && styles.countInputServed,
                    ]}
                    value={countValue}
                    editable={!countDisabled}
                    keyboardType="number-pad"
                    placeholder="۱"
                    placeholderTextColor={colors.textSubtle}
                    textAlign="center"
                    onChangeText={(text) =>
                      setGuestCounts((current) => ({
                        ...current,
                        [meal.id]: text,
                      }))
                    }
                    onBlur={() => commitGuestCount(meal)}
                  />
                </View>

                <Pressable
                  style={[
                    styles.serveButton,
                    meal.isServed && styles.serveButtonDone,
                    (!meal.isRequired || busy) && styles.serveButtonDisabled,
                  ]}
                  disabled={!meal.isRequired || busy}
                  onPressIn={() => {
                    skipBlurCommitRef.current = meal.id;
                  }}
                  onPress={() => handleServe(meal)}
                >
                  <Ionicons
                    name={
                      meal.isServed
                        ? "checkmark-circle"
                        : "restaurant-outline"
                    }
                    size={16}
                    color={meal.isServed ? colors.success : colors.primaryDark}
                  />
                  <Text
                    style={[
                      styles.serveButtonText,
                      meal.isServed && styles.serveButtonTextDone,
                    ]}
                  >
                    {meal.isServed
                      ? `تحویل ${meal.guestCount.toLocaleString("fa-IR")} نفر`
                      : "تحویل"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  heading: {
    ...formTypography.heading,
    color: colors.primaryDark,
    textAlign: "right",
    writingDirection: "rtl",
  },
  loading: {
    ...formTypography.body,
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    ...formTypography.title,
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    ...formTypography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  dayCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayTitle: {
    ...formTypography.title,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
  },
  mealRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkboxRow: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  mealLabel: {
    ...formTypography.body,
    color: colors.text,
    textAlign: "right",
  },
  mealLabelMuted: {
    color: colors.textSubtle,
    textDecorationLine: "line-through",
  },
  countWrap: {
    alignItems: "center",
    gap: 2,
  },
  countLabel: {
    ...formTypography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  countInput: {
    width: 52,
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    ...formTypography.body,
    color: colors.text,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  countInputDisabled: {
    opacity: 0.45,
    backgroundColor: colors.surface,
  },
  countInputServed: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  serveButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  serveButtonDone: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  serveButtonDisabled: {
    opacity: 0.45,
  },
  serveButtonText: {
    ...formTypography.caption,
    color: colors.primaryDark,
  },
  serveButtonTextDone: {
    color: colors.success,
  },
});
