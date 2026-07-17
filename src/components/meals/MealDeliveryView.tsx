import { Text } from "@/src/lib/fonts";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PersianDateField } from "@/src/components/PersianDateField";
import {
  EmptyState,
  PrimaryButton,
  SearchBar,
  SearchBarStickyWrap,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { formatTimeFromIso } from "@/src/lib/format-time";
import { mealTypeLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import {
  formatPersianDate,
  formatPersianNumber,
  parsePersianDate,
} from "@/src/lib/persianDate";
import {
  colors,
  formTypography,
  radius,
  spacing,
  typography,
} from "@/src/lib/theme";
import {
  listMealDeliveryPlans,
  toggleMealServed,
  type MealDeliveryItem,
} from "@/src/services/meals";
import { listMawkibs } from "@/src/services/mawkibs";
import type { MealType, UserGender } from "@/src/types";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

type MealDeliveryViewProps = {
  initialDate?: string;
  initialMealType?: MealType;
  initialMawkibId?: number;
  autoShowList?: boolean;
};

type AppliedParams = {
  mawkibId: number;
  date: string;
  mealType: MealType;
};

function parseGuestCountInput(value: string): number | null {
  const normalized = value.replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
  );
  const parsed = Number(normalized.trim());
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

function sumGuestCounts(items: MealDeliveryItem[], served?: boolean) {
  return items.reduce((sum, item) => {
    if (served === undefined) return sum + item.guestCount;
    if (served && item.isServed) return sum + item.guestCount;
    if (!served && !item.isServed) return sum + item.guestCount;
    return sum;
  }, 0);
}

function StatCounter({
  label,
  count,
  icon,
  accent,
  soft,
  mealHint,
}: {
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  soft: string;
  mealHint?: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: soft }]}>
      <Ionicons name={icon} size={18} color={accent} />
      <Text style={styles.statCount}>{formatPersianNumber(count)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {mealHint ? <Text style={styles.statMealHint}>{mealHint}</Text> : null}
    </View>
  );
}

function MealDeliveryRow({
  item,
  busy,
  guestCountValue,
  onGuestCountChange,
  onToggleServed,
}: {
  item: MealDeliveryItem;
  busy: boolean;
  guestCountValue: string;
  onGuestCountChange: (value: string) => void;
  onToggleServed: () => void;
}) {
  const skipBlurCommitRef = useRef(false);
  const countDisabled = item.isServed || busy;

  return (
    <View style={[styles.row, item.isServed && styles.rowServed]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.pilgrimName}</Text>
        <Text style={styles.rowCode}>{item.trackingCode}</Text>
      </View>

      <View style={styles.rowActions}>
        <View style={styles.countWrap}>
          <TextInput
            style={[
              styles.countInput,
              countDisabled && styles.countInputDisabled,
              item.isServed && styles.countInputServed,
            ]}
            value={guestCountValue}
            editable={!countDisabled}
            keyboardType="number-pad"
            placeholder="۱"
            placeholderTextColor={colors.textSubtle}
            textAlign="center"
            selectTextOnFocus
            onChangeText={onGuestCountChange}
            onBlur={() => {
              if (skipBlurCommitRef.current) {
                skipBlurCommitRef.current = false;
              }
            }}
          />
        </View>

        <View style={styles.serveColumn}>
          <Pressable
            style={[
              styles.serveButton,
              item.isServed && styles.serveButtonDone,
              busy && styles.serveButtonDisabled,
            ]}
            disabled={busy}
            onPressIn={() => {
              skipBlurCommitRef.current = true;
            }}
            onPress={onToggleServed}
          >
            <Ionicons
              name={item.isServed ? "checkmark-circle" : "restaurant-outline"}
              size={16}
              color={item.isServed ? colors.success : colors.primaryDark}
            />
            <Text
              style={[
                styles.serveButtonText,
                item.isServed && styles.serveButtonTextDone,
              ]}
            >
              {item.isServed ? "تحویل شد" : "تحویل"}
            </Text>
          </Pressable>
          {item.isServed && item.servedAt ? (
            <Text style={styles.servedTime}>
              {formatTimeFromIso(item.servedAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function MealDeliveryView({
  initialDate,
  initialMealType,
  initialMawkibId,
  autoShowList = false,
}: MealDeliveryViewProps = {}) {
  const { ownerId } = useAuth();
  const queryClient = useQueryClient();
  const today = todayDateStringInAppTz();
  const autoShowDoneRef = useRef(false);

  const [selectedMawkibId, setSelectedMawkibId] = useState<number | null>(
    initialMawkibId ?? null,
  );
  const [datePersian, setDatePersian] = useState(
    initialDate ? formatPersianDate(initialDate) : formatPersianDate(today),
  );
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    initialMealType ?? "Lunch",
  );
  const [appliedParams, setAppliedParams] = useState<AppliedParams | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [gender, setGender] = useState<UserGender | "">("");
  const [busyMealId, setBusyMealId] = useState<number | null>(null);
  const [guestCounts, setGuestCounts] = useState<Record<number, string>>({});

  const mawkibsQuery = useQuery({
    queryKey: ["mawkibs", ownerId],
    enabled: !!ownerId,
    queryFn: () => listMawkibs(ownerId!),
  });

  const mawkibs = mawkibsQuery.data ?? [];
  const hideMawkibPicker = mawkibs.length <= 1;

  useEffect(() => {
    if (selectedMawkibId != null) return;
    if (initialMawkibId != null) {
      setSelectedMawkibId(initialMawkibId);
      return;
    }
    if (mawkibs.length === 1) {
      setSelectedMawkibId(mawkibs[0].id);
    }
  }, [initialMawkibId, mawkibs, selectedMawkibId]);

  useEffect(() => {
    if (!autoShowList || autoShowDoneRef.current || !ownerId) return;

    const mawkibId =
      initialMawkibId ??
      selectedMawkibId ??
      (mawkibs.length === 1 ? mawkibs[0].id : null);
    if (!mawkibId || !initialDate) return;

    const mealType = initialMealType ?? "Lunch";
    autoShowDoneRef.current = true;
    setSelectedMawkibId(mawkibId);
    setDatePersian(formatPersianDate(initialDate));
    setSelectedMealType(mealType);
    setAppliedParams({
      mawkibId,
      date: initialDate,
      mealType,
    });
  }, [
    autoShowList,
    initialDate,
    initialMealType,
    initialMawkibId,
    mawkibs,
    ownerId,
    selectedMawkibId,
  ]);

  const deliveryQuery = useQuery({
    queryKey: [
      "meal-delivery",
      ownerId,
      appliedParams?.mawkibId,
      appliedParams?.date,
      appliedParams?.mealType,
      debouncedQuery,
      gender,
    ],
    enabled: !!ownerId && appliedParams != null,
    queryFn: () =>
      listMealDeliveryPlans(ownerId!, {
        mawkibId: appliedParams!.mawkibId,
        date: appliedParams!.date,
        mealType: appliedParams!.mealType,
        query: debouncedQuery || undefined,
        gender: gender || undefined,
      }),
  });

  const items = deliveryQuery.data ?? [];

  useEffect(() => {
    setGuestCounts((current) => {
      const next = { ...current };
      for (const item of items) {
        if (!(item.id in next) || item.isServed) {
          next[item.id] = String(item.guestCount);
        }
      }
      return next;
    });
  }, [items]);

  const stats = useMemo(
    () => ({
      total: sumGuestCounts(items),
      served: sumGuestCounts(items, true),
      notServed: sumGuestCounts(items, false),
    }),
    [items],
  );

  const invalidateDelivery = () => {
    queryClient.invalidateQueries({ queryKey: ["meal-delivery"] });
    queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
    queryClient.invalidateQueries({ queryKey: ["meal-report"] });
  };

  const serveMutation = useMutation({
    mutationFn: ({
      mealPlanId,
      isServed,
      guestCount,
    }: {
      mealPlanId: number;
      isServed: boolean;
      guestCount: number;
    }) => {
      setBusyMealId(mealPlanId);
      return toggleMealServed(ownerId!, mealPlanId, isServed, guestCount);
    },
    onSuccess: invalidateDelivery,
    onError: (error: Error) => notify("خطا", error.message),
    onSettled: () => setBusyMealId(null),
  });

  const handleShowList = () => {
    if (!selectedMawkibId) {
      notify("توجه", "ابتدا موکب را انتخاب کنید");
      return;
    }
    const date = parsePersianDate(datePersian);
    if (!date) {
      notify("خطا", "تاریخ را انتخاب کنید");
      return;
    }
    setAppliedParams({
      mawkibId: selectedMawkibId,
      date,
      mealType: selectedMealType,
    });
  };

  const handleToggleServed = (item: MealDeliveryItem) => {
    if (item.isServed) {
      serveMutation.mutate({
        mealPlanId: item.id,
        isServed: false,
        guestCount: item.guestCount,
      });
      return;
    }

    const parsed = parseGuestCountInput(guestCounts[item.id] ?? "");
    if (parsed == null) {
      notify("خطا", "تعداد نفرات باید حداقل ۱ باشد");
      return;
    }
    serveMutation.mutate({
      mealPlanId: item.id,
      isServed: true,
      guestCount: parsed,
    });
  };

  if (mawkibsQuery.isLoading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  if (mawkibs.length === 0) {
    return (
      <EmptyState
        icon="home-outline"
        title="موکبی ثبت نشده"
        description="ابتدا یک موکب ثبت کنید."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {!hideMawkibPicker ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>انتخاب موکب</Text>
          <View style={styles.mawkibRow}>
            {mawkibs.map((mawkib) => {
              const selected = selectedMawkibId === mawkib.id;
              return (
                <PrimaryButton
                  key={mawkib.id}
                  label={mawkib.name}
                  variant={selected ? "primary" : "secondary"}
                  compact
                  onPress={() => setSelectedMawkibId(mawkib.id)}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <PersianDateField
          label="تاریخ"
          value={datePersian}
          onChange={setDatePersian}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>وعده غذایی</Text>
        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map((mealType) => {
            const selected = selectedMealType === mealType;
            return (
              <Pressable
                key={mealType}
                style={[
                  styles.mealTypeButton,
                  selected && styles.mealTypeButtonSelected,
                ]}
                onPress={() => setSelectedMealType(mealType)}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    selected && styles.mealTypeTextSelected,
                  ]}
                >
                  {mealTypeLabel[mealType]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PrimaryButton
        label={`نمایش لیست ${mealTypeLabel[selectedMealType]}`}
        icon="list-outline"
        onPress={handleShowList}
        disabled={!selectedMawkibId}
      />

      {appliedParams ? (
        <>
          <View style={styles.statsRow}>
            <StatCounter
              label="کل وعده‌ها"
              count={stats.total}
              icon="restaurant-outline"
              accent={colors.primaryDark}
              soft={colors.primaryLight}
              mealHint={mealTypeLabel[appliedParams.mealType]}
            />
            <StatCounter
              label="تحویل شده"
              count={stats.served}
              icon="checkmark-circle-outline"
              accent={colors.success}
              soft={colors.successLight}
              mealHint={mealTypeLabel[appliedParams.mealType]}
            />
            <StatCounter
              label="عدم تحویل"
              count={stats.notServed}
              icon="time-outline"
              accent={colors.warning}
              soft={colors.warningLight}
              mealHint={mealTypeLabel[appliedParams.mealType]}
            />
          </View>

          <View style={styles.filtersGroup}>
            <SearchBarStickyWrap>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="تلفن همراه یا نام و نام خانوادگی"
                flushRight
              />
            </SearchBarStickyWrap>

            <View style={styles.genderSection}>
              <Text style={styles.sectionTitle}>جنسیت</Text>
              <View style={styles.genderRow}>
                {(
                  [
                    ["", "همه"],
                    ["Male", "مرد"],
                    ["Female", "زن"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = gender === value;
                  return (
                    <Pressable
                      key={value || "all"}
                      style={[
                        styles.genderButton,
                        selected && styles.genderButtonSelected,
                      ]}
                      onPress={() => setGender(value as UserGender | "")}
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
          </View>

          {deliveryQuery.isFetching && items.length === 0 ? (
            <Text style={styles.loadingText}>در حال بارگذاری...</Text>
          ) : null}

          {!deliveryQuery.isFetching && items.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              title="وعده‌ای یافت نشد"
              description="برای این تاریخ و وعده، زائری با برنامه غذایی فعال ثبت نشده است."
            />
          ) : null}

          {items.map((item) => (
            <MealDeliveryRow
              key={item.id}
              item={item}
              busy={busyMealId === item.id}
              guestCountValue={guestCounts[item.id] ?? String(item.guestCount)}
              onGuestCountChange={(value) =>
                setGuestCounts((current) => ({ ...current, [item.id]: value }))
              }
              onToggleServed={() => handleToggleServed(item)}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: spacing.lg,
  },
  loader: {
    marginTop: spacing.xl,
  },
  section: {
    width: "100%",
    gap: spacing.sm,
  },
  sectionTitle: {
    ...formTypography.title,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  mawkibRow: {
    gap: spacing.sm,
  },
  mealTypeRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  mealTypeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  mealTypeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  mealTypeText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  mealTypeTextSelected: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
  },
  statCount: {
    ...formTypography.heading,
    fontSize: 18,
    color: colors.text,
  },
  statLabel: {
    ...formTypography.caption,
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 11,
  },
  statMealHint: {
    ...formTypography.caption,
    color: colors.textSubtle,
    textAlign: "center",
    fontSize: 9,
    marginTop: 1,
  },
  filtersGroup: {
    width: "100%",
    gap: spacing.xs,
  },
  genderSection: {
    width: "100%",
    gap: spacing.xs,
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
  loadingText: {
    ...formTypography.body,
    textAlign: "center",
    color: colors.textMuted,
  },
  row: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowServed: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  rowInfo: {
    flex: 1,
    minWidth: 120,
    alignItems: "flex-end",
    gap: 2,
  },
  rowName: {
    ...formTypography.title,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  rowCode: {
    ...formTypography.caption,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 11,
  },
  rowActions: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  serveColumn: {
    alignItems: "center",
    gap: 2,
  },
  countWrap: {
    alignItems: "center",
  },
  countInput: {
    width: 52,
    minHeight: 38,
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
    backgroundColor: colors.surface,
  },
  serveButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  serveButtonDone: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
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
  servedTime: {
    ...formTypography.caption,
    color: colors.success,
    textAlign: "center",
    fontSize: 10,
  },
});
