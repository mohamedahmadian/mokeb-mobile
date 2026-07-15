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
import { PersianDateField } from "@/src/components/PersianDateField";
import { EmptyState } from "@/src/components/ui";
import { Text } from "@/src/lib/fonts";
import { fontFamilies } from "@/src/lib/fonts";
import { addGregorianDays, todayDateStringInAppTz } from "@/src/lib/date-only";
import {
  formatPersianDate,
  persianWeekdayLabel,
} from "@/src/lib/persianDate";
import { parsePersianDate } from "@/src/lib/persianDate";
import { colors, radius, spacing } from "@/src/lib/theme";
import { getDashboardCarouselDates } from "@/src/services/mawkib-inventory";
import {
  getMawkibCapacityReports,
  type MawkibCapacityReport,
} from "@/src/services/reports";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CAROUSEL_RADIUS_DAYS = 14;

function carouselDatesAround(centerDate: string, radiusDays = CAROUSEL_RADIUS_DAYS) {
  const dates: string[] = [];
  for (let offset = -radiusDays; offset <= radiusDays; offset++) {
    dates.push(addGregorianDays(centerDate, offset));
  }
  return dates;
}

function indexFromOffset(offsetX: number, length: number) {
  const next = Math.round(offsetX / SCREEN_WIDTH);
  return Math.max(0, Math.min(length - 1, next));
}

type MawkibReportsDayCarouselProps = {
  ownerId: number;
  renderReport: (report: MawkibCapacityReport, date: string) => React.ReactNode;
};

const ReportsDayPage = memo(function ReportsDayPage({
  date,
  ownerId,
  renderReport,
}: {
  date: string;
  ownerId: number;
  renderReport: (report: MawkibCapacityReport, date: string) => React.ReactNode;
}) {
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["reports-mawkibs", ownerId, date],
    queryFn: () => getMawkibCapacityReports(ownerId, date),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <View style={styles.page}>
        <Text style={styles.loading}>در حال بارگذاری...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.page}>
        <EmptyState
          icon="alert-circle-outline"
          title="خطا در بارگذاری"
          description={
            error instanceof Error ? error.message : "گزارش در دسترس نیست"
          }
        />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.page}>
        <EmptyState
          icon="home-outline"
          title="موکبی ثبت نشده"
          description="ابتدا یک موکب اضافه کنید تا گزارش ظرفیت نمایش داده شود."
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {data.map((report) => (
        <View key={report.id}>{renderReport(report, date)}</View>
      ))}
    </View>
  );
});

const ReportsDayList = memo(
  function ReportsDayList({
    dates,
    ownerId,
    initialIndex,
    onIndexChange,
    listRef,
    renderReport,
  }: {
    dates: string[];
    ownerId: number;
    initialIndex: number;
    onIndexChange: (index: number) => void;
    listRef: React.RefObject<FlatList<string> | null>;
    renderReport: (report: MawkibCapacityReport, date: string) => React.ReactNode;
  }) {
    const indexRef = useRef(initialIndex);
    const onIndexChangeRef = useRef(onIndexChange);
    onIndexChangeRef.current = onIndexChange;

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

    const renderItem = useCallback(
      ({ item }: { item: string }) => (
        <View style={styles.pageSlide}>
          <ReportsDayPage
            date={item}
            ownerId={ownerId}
            renderReport={renderReport}
          />
        </View>
      ),
      [ownerId, renderReport],
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
  (prev, next) =>
    prev.ownerId === next.ownerId &&
    prev.initialIndex === next.initialIndex &&
    prev.dates === next.dates &&
    prev.listRef === next.listRef &&
    prev.onIndexChange === next.onIndexChange &&
    prev.renderReport === next.renderReport,
);

export function MawkibReportsDayCarousel({
  ownerId,
  renderReport,
}: MawkibReportsDayCarouselProps) {
  const queryClient = useQueryClient();
  const today = todayDateStringInAppTz();
  const defaultDates = useMemo(() => getDashboardCarouselDates(CAROUSEL_RADIUS_DAYS), []);
  const [dates, setDates] = useState(defaultDates);
  const initialIndex = Math.max(0, dates.indexOf(today));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  const activeDate = dates[activeIndex] ?? today;
  const isToday = activeDate === today;
  const weekday = persianWeekdayLabel(activeDate);

  useEffect(() => {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const date = dates[activeIndex + offset];
      if (!date) continue;
      void queryClient.prefetchQuery({
        queryKey: ["reports-mawkibs", ownerId, date],
        queryFn: () => getMawkibCapacityReports(ownerId, date),
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

  const goToDate = useCallback(
    (isoDate: string) => {
      const existingIndex = dates.indexOf(isoDate);
      if (existingIndex >= 0) {
        goToIndex(existingIndex);
        return;
      }
      const nextDates = carouselDatesAround(isoDate, CAROUSEL_RADIUS_DAYS);
      const centerIndex = CAROUSEL_RADIUS_DAYS;
      setDates(nextDates);
      setActiveIndex(centerIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: centerIndex, animated: false });
      });
    },
    [dates, goToIndex],
  );

  const handleDateFieldChange = useCallback(
    (persian: string) => {
      const isoDate = parsePersianDate(persian);
      if (!isoDate) return;
      goToDate(isoDate);
    },
    [goToDate],
  );

  return (
    <View style={styles.section}>
      <View style={styles.dateBanner}>
        <Text style={styles.dateBannerText}>
          {weekday} — {formatPersianDate(activeDate)}
          {isToday ? " (امروز)" : ""}
        </Text>
        <Text style={styles.dateHint}>برای دیدن روزهای دیگر، به چپ یا راست بکشید</Text>
      </View>

      <View style={styles.dateFieldWrap}>
        <PersianDateField
          label="انتخاب تاریخ"
          value={formatPersianDate(activeDate)}
          onChange={handleDateFieldChange}
        />
      </View>

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
            {isToday ? "(امروز) " : ""}
            {formatPersianDate(activeDate)}
          </Text>
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

      <ReportsDayList
        key={dates[0]}
        dates={dates}
        ownerId={ownerId}
        initialIndex={activeIndex}
        onIndexChange={setActiveIndex}
        listRef={listRef}
        renderReport={renderReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  dateBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: "center",
    marginHorizontal: spacing.lg,
  },
  dateBannerText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: colors.primaryDark,
    textAlign: "center",
    writingDirection: "rtl",
  },
  dateHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
  },
  dateFieldWrap: {
    paddingHorizontal: spacing.lg,
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
  pageSlide: {
    width: SCREEN_WIDTH,
  },
  page: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  loading: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
});
