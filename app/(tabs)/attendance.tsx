import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { AttendanceReservationCard } from "@/src/components/AttendanceReservationCard";
import {
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
  SearchBar,
  SearchBarStickyWrap,
} from "@/src/components/ui";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { exportAttendanceToExcel } from "@/src/lib/attendance-export";
import { presenceStateLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { formatPersianDate } from "@/src/lib/persianDate";
import { colors, spacing } from "@/src/lib/theme";
import {
  listAbsentReservations,
  listPresentReservations,
  recordAttendanceEvent,
} from "@/src/services/attendance";
import { lookupReservation } from "@/src/services/reservations";
import type { Reservation, ReservationEventType } from "@/src/types";

type AttendanceView = "menu" | "search" | "present" | "absent";

export default function AttendanceScreen() {
  const { user, ownerId } = useAuth();
  const queryClient = useQueryClient();
  const { attendanceQuery, attendanceRequestId, attendanceView } =
    useLocalSearchParams<{
      attendanceQuery?: string;
      attendanceRequestId?: string;
      attendanceView?: AttendanceView;
    }>();
  const handledRequestId = useRef<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<AttendanceView>("menu");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [isExporting, setIsExporting] = useState(false);
  const [activeAction, setActiveAction] = useState<{
    reservationId: number;
    eventType: ReservationEventType;
  } | null>(null);

  useEffect(() => {
    if (
      !attendanceRequestId ||
      handledRequestId.current === attendanceRequestId
    ) {
      return;
    }

    handledRequestId.current = attendanceRequestId;

    if (
      attendanceView === "search" ||
      attendanceView === "present" ||
      attendanceView === "absent"
    ) {
      setActiveView(attendanceView);
      setQuery(attendanceQuery ?? "");
      return;
    }

    if (attendanceQuery) {
      setActiveView("search");
      setQuery(attendanceQuery);
    }
  }, [attendanceQuery, attendanceRequestId, attendanceView]);

  const lookupQuery = useQuery({
    queryKey: ["attendance-lookup", ownerId, debouncedQuery],
    enabled: activeView === "search" && !!ownerId && debouncedQuery.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => lookupReservation(ownerId!, debouncedQuery),
  });

  const presentQuery = useQuery({
    queryKey: ["attendance-present", ownerId, debouncedQuery],
    enabled: activeView === "present" && !!ownerId,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listPresentReservations(ownerId!, {
        query: debouncedQuery || undefined,
      }),
  });

  const absentQuery = useQuery({
    queryKey: ["attendance-absent", ownerId, debouncedQuery],
    enabled: activeView === "absent" && !!ownerId,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listAbsentReservations(ownerId!, {
        query: debouncedQuery || undefined,
      }),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    if (activeView === "search") {
      await lookupQuery.refetch();
      return;
    }
    if (activeView === "present") {
      await presentQuery.refetch();
      return;
    }
    if (activeView === "absent") {
      await absentQuery.refetch();
    }
  });

  const attendanceMutation = useMutation({
    mutationFn: ({
      reservationId,
      eventType,
    }: {
      reservationId: number;
      eventType: ReservationEventType;
    }) => {
      setActiveAction({ reservationId, eventType });
      return recordAttendanceEvent(ownerId!, reservationId, eventType);
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<Reservation[]>(
        ["attendance-lookup", ownerId, debouncedQuery],
        (current) =>
          (current ?? []).map((item) =>
            item.id === updated.id ? updated : item,
          ),
      );
      queryClient.invalidateQueries({
        queryKey: ["attendance-events", ownerId, variables.reservationId],
      });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-present"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-absent"] });
      notify("موفق", "رویداد با موفقیت ثبت شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
    onSettled: () => setActiveAction(null),
  });

  const results = useMemo(() => lookupQuery.data ?? [], [lookupQuery.data]);
  const attendanceList =
    activeView === "present"
      ? (presentQuery.data ?? [])
      : activeView === "absent"
        ? (absentQuery.data ?? [])
        : [];
  const listIsFetching =
    activeView === "present"
      ? presentQuery.isFetching
      : activeView === "absent"
        ? absentQuery.isFetching
        : false;
  const showEmpty =
    debouncedQuery.length > 0 &&
    !lookupQuery.isFetching &&
    results.length === 0;

  const openView = (view: AttendanceView) => {
    setQuery("");
    setActiveView(view);
  };

  const closeView = () => {
    setQuery("");
    setActiveView("menu");
  };

  const handleExport = async () => {
    if (activeView !== "present" && activeView !== "absent") return;
    try {
      setIsExporting(true);
      await exportAttendanceToExcel(attendanceList, activeView);
    } catch (error) {
      notify(
        "خطا",
        error instanceof Error ? error.message : "خطا در ساخت فایل اکسل",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        title={
          activeView === "search"
            ? "جستجوی زائر"
            : activeView === "present"
              ? "لیست حاضرین"
              : activeView === "absent"
                ? "لیست غائبین"
                : "ورود و خروج"
        }
        subtitle={
          activeView === "menu" ? "مدیریت حضور و غیاب زائرین" : undefined
        }
        onBack={activeView !== "menu" ? closeView : undefined}
        showLogo
      />

      <ScreenScroll
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={activeView !== "menu" ? [0] : undefined}
        refreshControl={
          activeView !== "menu" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {activeView === "menu" ? (
          <View style={styles.menu}>
            <ListCard
              title="جستجوی زائر"
              titleIcon="search-outline"
              subtitle="جستجو با کد رزرو، شماره موبایل یا کد ملی و ثبت ورود و خروج"
              onPress={() => openView("search")}
            />
            <ListCard
              title="لیست حاضرین"
              titleIcon="people-outline"
              subtitle="مشاهده و جستجوی زائرینی که اکنون در موکب حضور دارند"
              onPress={() => openView("present")}
            />
            <ListCard
              title="لیست غائبین"
              titleIcon="person-remove-outline"
              subtitle="مشاهده زائرین واردنشده یا خارج‌شده به‌صورت موقت"
              onPress={() => openView("absent")}
            />
          </View>
        ) : (
          <SearchBarStickyWrap>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={
                activeView === "search"
                  ? "نام خانوادگی، کد رزرو، موبایل یا کد ملی"
                  : "نام خانوادگی، موبایل، کد ملی یا شناسه رزرو"
              }
              autoFocus={activeView === "search"}
              flushRight
            />
          </SearchBarStickyWrap>
        )}

        {activeView === "search" ? (
          <>
            {!debouncedQuery ? (
              <EmptyState
                icon="search-outline"
                title="جستجوی زائر"
                description="نام و نام خانوادگی، کد رزرو، شماره موبایل یا کد ملی زائر را وارد کنید."
              />
            ) : null}

            {lookupQuery.isFetching && results.length === 0 ? (
              <Text style={styles.loading}>در حال جستجو...</Text>
            ) : null}

            {showEmpty ? (
              <EmptyState
                icon="search-outline"
                title="رزروی یافت نشد"
                description="رزرو تایید شده‌ای با این مشخصات پیدا نشد."
              />
            ) : null}

            {results.map((reservation) => (
              <AttendanceReservationCard
                key={reservation.id}
                reservation={reservation}
                loadingAction={
                  activeAction?.reservationId === reservation.id
                    ? activeAction.eventType
                    : null
                }
                onAction={(reservationId, eventType) =>
                  attendanceMutation.mutate({ reservationId, eventType })
                }
              />
            ))}
          </>
        ) : null}

        {activeView === "present" || activeView === "absent" ? (
          <>
            <PrimaryButton
              label="دانلود فایل اکسل"
              icon="download-outline"
              variant="secondary"
              compact
              loading={isExporting}
              disabled={!attendanceList.length}
              onPress={handleExport}
            />

            {listIsFetching && attendanceList.length === 0 ? (
              <Text style={styles.loading}>در حال بارگذاری...</Text>
            ) : null}

            {!listIsFetching && attendanceList.length === 0 ? (
              <EmptyState
                icon={
                  activeView === "present"
                    ? "people-outline"
                    : "person-remove-outline"
                }
                title={
                  query.trim()
                    ? "موردی پیدا نشد"
                    : activeView === "present"
                      ? "زائر حاضری وجود ندارد"
                      : "زائر غائبی وجود ندارد"
                }
                description={
                  query.trim() ? "عبارت جستجو را تغییر دهید." : undefined
                }
              />
            ) : null}

            {attendanceList.map((reservation) => {
              const isPresent = reservation.presenceState === "PRESENT";
              return (
                <ListCard
                  key={reservation.id}
                  title={reservation.pilgrimName ?? "زائر"}
                  titleIcon="person-outline"
                  badge={presenceStateLabel[reservation.presenceState]}
                  badgeColor={
                    isPresent
                      ? colors.successLight
                      : reservation.presenceState === "TEMPORARILY_OUT"
                        ? colors.warningLight
                        : colors.borderLight
                  }
                  badgeTextColor={
                    isPresent
                      ? colors.success
                      : reservation.presenceState === "TEMPORARILY_OUT"
                        ? colors.warning
                        : colors.textMuted
                  }
                  details={[
                    {
                      icon: "barcode-outline",
                      label: "شناسه رزرو",
                      value: reservation.trackingCode,
                    },
                    {
                      icon: "home-outline",
                      label: "موکب",
                      value: reservation.mawkibName ?? "نامشخص",
                    },
                    {
                      icon: "calendar-outline",
                      label: "تاریخ شروع",
                      value: formatPersianDate(reservation.reservationDate),
                    },
                    {
                      icon: "time-outline",
                      label: "تاریخ پایان",
                      value: formatPersianDate(reservation.reservationEndDate),
                    },
                  ]}
                />
              );
            })}
          </>
        ) : null}
      </ScreenScroll>
      <NewReservationFab />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    alignItems: "stretch",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  menu: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
