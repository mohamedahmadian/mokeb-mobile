import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CapacityStatGrid } from "@/src/components/charts";
import { Text } from "@/src/lib/fonts";
import { fontFamilies } from "@/src/lib/fonts";
import { formatPersianDate, formatPersianNumber } from "@/src/lib/persianDate";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { colors, radius, spacing } from "@/src/lib/theme";
import {
  getDashboardCarouselDates,
  getSnapshotsForOwnerOnDate,
  type MawkibCapacitySnapshot,
} from "@/src/services/mawkib-inventory";

const SCREEN_WIDTH = Dimensions.get("window").width;

type CapacityDayCarouselProps = {
  ownerId: number;
  onOpenCalendar?: (mawkibId?: number) => void;
  onOpenDetails?: () => void;
  canOpenDetails?: boolean;
};

function indexFromOffset(offsetX: number, length: number) {
  const next = Math.round(offsetX / SCREEN_WIDTH);
  return Math.max(0, Math.min(length - 1, next));
}

function CapacityMawkibCard({
  snapshot,
  onPress,
}: {
  snapshot: MawkibCapacitySnapshot;
  onPress?: () => void;
}) {
  const occupancy =
    snapshot.totalCapacity > 0
      ? Math.round((snapshot.totalFilled / snapshot.totalCapacity) * 100)
      : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.capacityCard,
        pressed && onPress && styles.capacityCardPressed,
      ]}
    >
      <View style={styles.capacityCardHeader}>
        <View style={styles.capacityOccupancy}>
          <Text style={styles.capacityOccupancyValue}>
            {formatPersianNumber(occupancy)}٪
          </Text>
        </View>
        <View style={styles.capacityTitleWrap}>
          <Text style={styles.capacityName}>
            {snapshot.name} ({formatPersianDate(snapshot.date)})
          </Text>
          <Text style={styles.capacitySummary}>
            {formatPersianNumber(snapshot.totalFilled)}/
            {formatPersianNumber(snapshot.totalCapacity)} - (
            {formatPersianNumber(snapshot.totalRemaining)} خالی)
          </Text>
        </View>
      </View>
      <CapacityStatGrid
        maleCapacity={snapshot.maleCapacity}
        femaleCapacity={snapshot.femaleCapacity}
        totalCapacity={snapshot.totalCapacity}
        maleFilled={snapshot.reservedMale}
        femaleFilled={snapshot.reservedFemale}
        totalFilled={snapshot.totalFilled}
        maleRemaining={snapshot.availableMale}
        femaleRemaining={snapshot.availableFemale}
        totalRemaining={snapshot.totalRemaining}
        compact
      />
    </Pressable>
  );
}

const DayPage = memo(function DayPage({
  date,
  ownerId,
  onOpenCalendar,
}: {
  date: string;
  ownerId: number;
  onOpenCalendar?: (mawkibId?: number) => void;
}) {
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["mawkib-capacity-day", ownerId, date],
    queryFn: () => getSnapshotsForOwnerOnDate(ownerId, date),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <View style={styles.page}>
        <Text style={styles.loading}>در حال بارگذاری ظرفیت...</Text>
      </View>
    );
  }

  if (snapshots.length === 0) {
    return (
      <View style={styles.page}>
        <Text style={styles.empty}>هنوز موکبی ثبت نشده است.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {snapshots.map((snapshot) => (
        <CapacityMawkibCard
          key={`${snapshot.id}-${snapshot.date}`}
          snapshot={snapshot}
          onPress={
            onOpenCalendar ? () => onOpenCalendar(snapshot.id) : undefined
          }
        />
      ))}
    </View>
  );
});

const CapacityDayList = memo(
  function CapacityDayList({
    dates,
    ownerId,
    initialIndex,
    onOpenCalendar,
    onIndexChange,
    listRef,
  }: {
    dates: string[];
    ownerId: number;
    initialIndex: number;
    onOpenCalendar?: (mawkibId?: number) => void;
    onIndexChange: (index: number) => void;
    listRef: React.RefObject<FlatList<string> | null>;
  }) {
    const indexRef = useRef(initialIndex);
    const onIndexChangeRef = useRef(onIndexChange);
    const onOpenCalendarRef = useRef(onOpenCalendar);
    onIndexChangeRef.current = onIndexChange;
    onOpenCalendarRef.current = onOpenCalendar;

    const publishIndex = useCallback((next: number) => {
      if (next === indexRef.current) return;
      indexRef.current = next;
      onIndexChangeRef.current(next);
    }, []);

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        publishIndex(
          indexFromOffset(event.nativeEvent.contentOffset.x, dates.length),
        );
      },
      [dates.length, publishIndex],
    );

    const onViewableItemsChanged = useRef(
      ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
        const index = viewableItems[0]?.index;
        if (typeof index === "number") publishIndex(index);
      },
    ).current;

    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 55,
      minimumViewTime: 0,
    }).current;

    const openCalendar = useCallback((mawkibId?: number) => {
      onOpenCalendarRef.current?.(mawkibId);
    }, []);

    const renderItem = useCallback(
      ({ item }: { item: string }) => (
        <View style={styles.pageSlide}>
          <DayPage
            date={item}
            ownerId={ownerId}
            onOpenCalendar={onOpenCalendar ? openCalendar : undefined}
          />
        </View>
      ),
      [ownerId, onOpenCalendar, openCalendar],
    );

    return (
      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScroll={handleScroll}
        scrollEventThrottle={8}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        removeClippedSubviews
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToIndex({ index, animated: false });
          });
        }}
        renderItem={renderItem}
      />
    );
  },
  (prev, next) => {
    return (
      prev.ownerId === next.ownerId &&
      prev.initialIndex === next.initialIndex &&
      prev.dates === next.dates &&
      !!prev.onOpenCalendar === !!next.onOpenCalendar &&
      prev.listRef === next.listRef &&
      prev.onIndexChange === next.onIndexChange
    );
  },
);

export function CapacityDayCarousel({
  ownerId,
  onOpenCalendar,
  onOpenDetails,
  canOpenDetails = false,
}: CapacityDayCarouselProps) {
  const queryClient = useQueryClient();
  const dates = useMemo(() => getDashboardCarouselDates(14), []);
  const today = todayDateStringInAppTz();
  const initialIndex = Math.max(0, dates.indexOf(today));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  const activeDate = dates[activeIndex] ?? today;
  const isToday = activeDate === today;

  // پیش‌بارگذاری روز جاری و همسایه‌ها تا اسلاید بعدی فوری باشد
  useEffect(() => {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const date = dates[activeIndex + offset];
      if (!date) continue;
      void queryClient.prefetchQuery({
        queryKey: ["mawkib-capacity-day", ownerId, date],
        queryFn: () => getSnapshotsForOwnerOnDate(ownerId, date),
        staleTime: 60_000,
      });
    }
  }, [activeIndex, dates, ownerId, queryClient]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= dates.length) return;
      setActiveIndex(index);
      listRef.current?.scrollToIndex({ index, animated: true });
    },
    [dates.length],
  );

  return (
    <View style={styles.section}>
      <View style={styles.dayNav}>
        <Pressable
          onPress={() => goToIndex(activeIndex + 1)}
          hitSlop={8}
          style={styles.dayNavBtn}
          disabled={activeIndex >= dates.length - 1}
        >
          <Text
            style={[
              styles.dayNavLabel,
              activeIndex >= dates.length - 1 && styles.dayNavLabelDisabled,
            ]}
          >
            روز بعد ←
          </Text>
        </Pressable>
        <View style={styles.dayNavCenter}>
          <Text style={styles.dayNavDate}>
            {formatPersianDate(activeDate)}
            {isToday ? " (امروز)" : ""}
          </Text>
          <Text style={styles.dayNavHint}>برای تغییر روز اسلاید کنید</Text>
        </View>
        <Pressable
          onPress={() => goToIndex(activeIndex - 1)}
          hitSlop={8}
          style={styles.dayNavBtn}
          disabled={activeIndex <= 0}
        >
          <Text
            style={[
              styles.dayNavLabel,
              activeIndex <= 0 && styles.dayNavLabelDisabled,
            ]}
          >
            → روز قبل
          </Text>
        </Pressable>
      </View>

      <CapacityDayList
        dates={dates}
        ownerId={ownerId}
        initialIndex={initialIndex}
        onOpenCalendar={onOpenCalendar}
        onIndexChange={setActiveIndex}
        listRef={listRef}
      />

      {onOpenCalendar ? (
        <Pressable
          onPress={() => onOpenCalendar()}
          style={({ pressed }) => [
            styles.calendarCta,
            pressed && styles.capacityCardPressed,
          ]}
        >
          <Text style={styles.calendarCtaText}>....</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  capacityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  capacityLink: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dayNavBtn: {
    paddingVertical: spacing.xs,
  },
  dayNavLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: colors.primary,
  },
  dayNavLabelDisabled: {
    opacity: 0.35,
  },
  dayNavCenter: {
    flex: 1,
    alignItems: "center",
  },
  dayNavDate: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: colors.text,
  },
  dayNavHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSubtle,
    textAlign: "center",
    writingDirection: "rtl",
  },
  pageSlide: {
    width: SCREEN_WIDTH,
  },
  page: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  loading: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  capacityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  capacityCardPressed: {
    opacity: 0.92,
  },
  capacityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  capacityTitleWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  capacityName: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  capacitySummary: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  capacityOccupancy: {
    minWidth: 48,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.accentLight,
    alignItems: "center",
  },
  capacityOccupancyValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: colors.accent,
  },
  calendarCta: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
  },
  calendarCtaText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.primaryDark,
  },
});
