import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { mealTypeLabel } from "@/src/lib/labels";
import { formatPersianDate } from "@/src/lib/persianDate";
import { colors, formTypography, radius, spacing } from "@/src/lib/theme";
import { groupMealPlansByDate } from "@/src/services/meals";
import type { MealPlan } from "@/src/types";

type MealPlanPanelProps = {
  meals: MealPlan[];
  loading?: boolean;
  busyMealId?: number | null;
  onToggleRequired: (meal: MealPlan, isRequired: boolean) => void;
  onToggleServed: (meal: MealPlan, isServed: boolean) => void;
};

export function MealPlanPanel({
  meals,
  loading = false,
  busyMealId = null,
  onToggleRequired,
  onToggleServed,
}: MealPlanPanelProps) {
  const days = groupMealPlansByDate(meals);

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

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>برنامه غذایی</Text>
      {days.map(({ date, meals: dayMeals }) => (
        <View key={date} style={styles.dayCard}>
          <Text style={styles.dayTitle}>{formatPersianDate(date)}</Text>
          {dayMeals.map((meal) => {
            const busy = busyMealId === meal.id;
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

                <Pressable
                  style={[
                    styles.serveButton,
                    meal.isServed && styles.serveButtonDone,
                    (!meal.isRequired || busy) && styles.serveButtonDisabled,
                  ]}
                  disabled={!meal.isRequired || busy}
                  onPress={() => onToggleServed(meal, !meal.isServed)}
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
                    {meal.isServed ? "تحویل شده" : "تحویل"}
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
