import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View } from "react-native";
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
import { useTabRefresh } from "@/src/hooks/useTabRefresh";
import { exportAttendanceToExcel } from "@/src/lib/attendance-export";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { presenceStateLabel } from "@/src/lib/labels";
import { notify } from "@/src/lib/notify";
import { formatPersianDate, formatPersianNumber } from "@/src/lib/persianDate";
import { colors, spacing } from "@/src/lib/theme";
import {
  countBulkAttendanceEligible,
  listAbsentReservations,
  listPresentReservations,
  listTodayOccupyingActiveReservations,
  recordAttendanceEvent,
  recordBulkAttendance,
  type BulkAttendanceAction,
} from "@/src/services/attendance";
import { lookupReservation } from "@/src/services/reservations";
import { listMawkibs } from "@/src/services/mawkibs";
import type { Reservation, ReservationEventType } from "@/src/types";

type AttendanceView = "menu" | "search" | "present" | "absent" | "group";

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
  const [selectedMawkibId, setSelectedMawkibId] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAttendanceAction | null>(
    null,
  );

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
      attendanceView === "absent" ||
      attendanceView === "group"
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

  const mawkibsQuery = useQuery({
    queryKey: ["mawkibs", ownerId],
    enabled: activeView === "group" && !!ownerId,
    queryFn: () => listMawkibs(ownerId!),
  });

  const mawkibs = mawkibsQuery.data ?? [];
  const hideMawkibPicker = mawkibs.length <= 1;

  useEffect(() => {
    if (activeView !== "group") return;
    if (selectedMawkibId != null) return;
    if (mawkibs.length === 1) {
      setSelectedMawkibId(mawkibs[0].id);
    }
  }, [activeView, mawkibs, selectedMawkibId]);

  const todayReservationsQuery = useQuery({
    queryKey: ["attendance-group-today", ownerId, selectedMawkibId],
    enabled: activeView === "group" && !!ownerId && selectedMawkibId != null,
    queryFn: () =>
      listTodayOccupyingActiveReservations(ownerId!, selectedMawkibId!),
  });

  const todayReservations = todayReservationsQuery.data ?? [];
  const bulkCheckInCount = useMemo(
    () => countBulkAttendanceEligible(todayReservations, "check_in"),
    [todayReservations],
  );
  const bulkCheckOutCount = useMemo(
    () => countBulkAttendanceEligible(todayReservations, "check_out"),
    [todayReservations],
  );
  const selectedMawkib =
    mawkibs.find((item) => item.id === selectedMawkibId) ?? null;

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
      return;
    }
    if (activeView === "group") {
      await mawkibsQuery.refetch();
      await todayReservationsQuery.refetch();
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

  const bulkAttendanceMutation = useMutation({
    mutationFn: (action: BulkAttendanceAction) => {
      setBulkAction(action);
      return recordBulkAttendance(ownerId!, selectedMawkibId!, action);
    },
    onSuccess: (result, action) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-present"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-absent"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-group-today"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });

      const actionLabel = action === "check_in" ? "ورود" : "خروج";
      if (result.processed === 0) {
        notify(
          "توجه",
          `رزروی برای ثبت ${actionLabel} همگانی در وضعیت مناسب نبود.`,
        );
        return;
      }

      const skippedNote =
        result.skipped > 0
          ? ` (${formatPersianNumber(result.skipped)} مورد رد شد)`
          : "";
      notify(
        "موفق",
        `${formatPersianNumber(result.processed)} رزرو با موفقیت ${actionLabel} همگانی ثبت شد${skippedNote}`,
      );
    },
    onError: (error: Error) => notify("خطا", error.message),
    onSettled: () => setBulkAction(null),
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
    setSelectedMawkibId(null);
    setActiveView("menu");
  };

  useTabRefresh({
    onReset: () => {
      setQuery("");
      setSelectedMawkibId(null);
      setActiveView("menu");
    },
    onRefresh: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance-lookup"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance-present"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance-absent"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance-group-today"] });
      void queryClient.invalidateQueries({ queryKey: ["mawkibs"] });
    },
  });

  const confirmBulkAttendance = (action: BulkAttendanceAction) => {
    if (!selectedMawkibId) {
      notify("توجه", "ابتدا موکب را انتخاب کنید");
      return;
    }

    const count =
      action === "check_in" ? bulkCheckInCount : bulkCheckOutCount;
    if (count === 0) {
      notify(
        "توجه",
        action === "check_in"
          ? "رزروی برای ثبت ورود همگانی در وضعیت مناسب نیست."
          : "رزروی برای ثبت خروج همگانی در وضعیت مناسب نیست.",
      );
      return;
    }

    const mawkibLabel = selectedMawkib?.name ?? "موکب";
    const actionTitle = action === "check_in" ? "ثبت ورود همگانی" : "ثبت خروج همگانی";
    const actionVerb = action === "check_in" ? "ورود" : "خروج";

    notify(
      actionTitle,
      `آیا از ثبت ${actionVerb} همگانی برای ${formatPersianNumber(count)} رزرو فعال امروز در «${mawkibLabel}» مطمئن هستید؟`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "تایید",
          onPress: () => bulkAttendanceMutation.mutate(action),
        },
      ],
    );
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
                : activeView === "group"
                  ? "ورود و خروج گروهی"
                  : "ورود و خروج"
        }
        subtitle={
          activeView === "menu"
            ? "مدیریت حضور و غیاب زائرین"
            : activeView === "group"
              ? `رزروهای فعال امروز — ${formatPersianDate(todayDateStringInAppTz())}`
              : undefined
        }
        onBack={activeView !== "menu" ? closeView : undefined}
        showLogo
      />

      <ScreenScroll
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={
          activeView === "search" ||
          activeView === "present" ||
          activeView === "absent"
            ? [0]
            : undefined
        }
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
            <ListCard
              title="ورود و خروج گروهی"
              titleIcon="people-circle-outline"
              subtitle="ثبت ورود یا خروج همزمان برای همه رزروهای فعال امروز"
              onPress={() => openView("group")}
            />
          </View>
        ) : activeView === "group" ? (
          <>
            {mawkibsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : mawkibs.length === 0 ? (
              <EmptyState
                icon="home-outline"
                title="موکبی ثبت نشده"
                description="ابتدا یک موکب ثبت کنید."
              />
            ) : (
              <>
                {!hideMawkibPicker ? (
                  <View style={styles.groupSection}>
                    <Text style={styles.groupSectionTitle}>انتخاب موکب</Text>
                    {mawkibs.map((mawkib) => (
                      <PrimaryButton
                        key={mawkib.id}
                        label={mawkib.name}
                        variant={
                          selectedMawkibId === mawkib.id
                            ? "primary"
                            : "secondary"
                        }
                        compact
                        onPress={() => setSelectedMawkibId(mawkib.id)}
                      />
                    ))}
                  </View>
                ) : null}

                {selectedMawkibId ? (
                  <View style={styles.groupSection}>
                    <ListCard
                      title="رزروهای فعال امروز"
                      titleIcon="calendar-outline"
                      subtitle={
                        todayReservationsQuery.isFetching
                          ? "در حال بارگذاری..."
                          : `${formatPersianNumber(todayReservations.length)} رزرو`
                      }
                      details={[
                        {
                          icon: "log-in-outline",
                          label: "قابل ثبت ورود",
                          value: formatPersianNumber(bulkCheckInCount),
                        },
                        {
                          icon: "log-out-outline",
                          label: "قابل ثبت خروج",
                          value: formatPersianNumber(bulkCheckOutCount),
                        },
                      ]}
                    />

                    <PrimaryButton
                      label="ثبت ورود همگانی"
                      icon="log-in-outline"
                      loading={bulkAction === "check_in"}
                      disabled={
                        bulkCheckInCount === 0 || bulkAttendanceMutation.isPending
                      }
                      onPress={() => confirmBulkAttendance("check_in")}
                    />
                    <PrimaryButton
                      label="ثبت خروج همگانی"
                      icon="log-out-outline"
                      variant="secondary"
                      loading={bulkAction === "check_out"}
                      disabled={
                        bulkCheckOutCount === 0 || bulkAttendanceMutation.isPending
                      }
                      onPress={() => confirmBulkAttendance("check_out")}
                    />
                  </View>
                ) : (
                  <EmptyState
                    icon="home-outline"
                    title="موکب را انتخاب کنید"
                    description="برای ادامه، یک موکب را انتخاب کنید."
                  />
                )}
              </>
            )}
          </>
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
  groupSection: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  groupSectionTitle: {
    textAlign: "right",
    writingDirection: "rtl",
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
