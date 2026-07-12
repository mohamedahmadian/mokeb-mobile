import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { PilgrimCardModal } from "@/src/components/PilgrimCardModal";
import {
  AppInput,
  EmptyState,
  FloatingActionButton,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  SearchBar,
  SearchBarStickyWrap,
  StickyBottomAction,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { notify } from "@/src/lib/notify";
import { reservationStatusLabel } from "@/src/lib/labels";
import {
  addDaysToPersianDate,
  formatPersianDate,
  parsePersianDate,
} from "@/src/lib/persianDate";
import { colors, formTypography, spacing } from "@/src/lib/theme";
import { openReservationSms } from "@/src/lib/reservation-track";
import { listMawkibs } from "@/src/services/mawkibs";
import {
  createPilgrim,
  getPilgrimByMobile,
  listPilgrims,
} from "@/src/services/pilgrims";
import type { PilgrimCardDetails } from "@/src/lib/reservation-track";
import type { Reservation, UserGender } from "@/src/types";
import {
  cancelReservation,
  createReservation,
  deleteReservation,
  getPilgrimCardDetails,
  listReservations,
  updateReservation,
} from "@/src/services/reservations";

const todayIso = new Date().toISOString().slice(0, 10);
const todayPersian = formatPersianDate(todayIso);
const tomorrowPersian = addDaysToPersianDate(todayPersian, 1) ?? todayPersian;

function GuestCounter({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterTitle}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.counterLabel}>{label}</Text>
      </View>
      <View style={styles.counterControls}>
        <Pressable
          style={({ pressed }) => [
            styles.counterButton,
            pressed && styles.counterButtonPressed,
          ]}
          onPress={() => onChange(Math.max(0, value - 1))}
          accessibilityRole="button"
          accessibilityLabel={`کاهش ${label}`}
        >
          <Ionicons name="remove" size={20} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.counterValue}>{value.toLocaleString("fa-IR")}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.counterButton,
            pressed && styles.counterButtonPressed,
          ]}
          onPress={() => onChange(value + 1)}
          accessibilityRole="button"
          accessibilityLabel={`افزایش ${label}`}
        >
          <Ionicons name="add" size={20} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

function DurationButton({
  days,
  selected,
  onPress,
}: {
  days: number;
  selected: boolean;
  onPress: () => void;
}) {
  const labels = ["", "یک‌روزه", "دوروزه", "سه‌روزه", "چهارروزه"];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.durationButton,
        selected && styles.durationButtonSelected,
        pressed && styles.durationButtonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`اقامت ${labels[days]}`}
    >
      <Ionicons
        name="calendar-outline"
        size={18}
        color={selected ? "#fff" : colors.primary}
      />
      <Text
        style={[
          styles.durationButtonText,
          selected && styles.durationButtonTextSelected,
        ]}
      >
        {labels[days]}
      </Text>
    </Pressable>
  );
}

function getStayDuration(startDate: string, endDate: string) {
  const startIso = parsePersianDate(startDate);
  const endIso = parsePersianDate(endDate);
  if (!startIso || !endIso) return 0;

  const difference =
    (Date.parse(`${endIso}T00:00:00.000Z`) -
      Date.parse(`${startIso}T00:00:00.000Z`)) /
    86_400_000;
  return difference >= 1 && difference <= 4 ? difference : 0;
}

export default function ReservationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reservationParams = useLocalSearchParams<{
    pilgrimId?: string;
    pilgrimName?: string;
    pilgrimMobile?: string;
    pilgrimGender?: UserGender | "";
    mawkibId?: string;
    reservationRequestId?: string;
  }>();
  const handledReservationRequest = useRef<string | null>(null);
  const hasAppliedGenderDefault = useRef(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [showForm, setShowForm] = useState(false);
  const [selectedMawkibId, setSelectedMawkibId] = useState<number | null>(null);
  const [selectedPilgrimId, setSelectedPilgrimId] = useState<number | null>(
    null,
  );
  const [selectedPilgrimMobile, setSelectedPilgrimMobile] = useState("");
  const [editingReservationId, setEditingReservationId] = useState<number | null>(
    null,
  );
  const [pilgrimQuery, setPilgrimQuery] = useState("");
  const [showNewPilgrimForm, setShowNewPilgrimForm] = useState(true);
  const [newPilgrimName, setNewPilgrimName] = useState("");
  const [newPilgrimMobile, setNewPilgrimMobile] = useState("");
  const [startDate, setStartDate] = useState(todayPersian);
  const [endDate, setEndDate] = useState(tomorrowPersian);
  const [durationDays, setDurationDays] = useState(1);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [cardDetails, setCardDetails] = useState<PilgrimCardDetails | null>(
    null,
  );
  const [cardLoading, setCardLoading] = useState(false);
  const [smsLoadingId, setSmsLoadingId] = useState<number | null>(null);
  const [extendingReservation, setExtendingReservation] =
    useState<Reservation | null>(null);
  const [extendStartDate, setExtendStartDate] = useState(todayPersian);
  const [extendEndDate, setExtendEndDate] = useState(tomorrowPersian);
  const [extendDurationDays, setExtendDurationDays] = useState(1);

  const applyPilgrimGenderDefault = (gender?: UserGender | null) => {
    if (hasAppliedGenderDefault.current || !gender) return;

    hasAppliedGenderDefault.current = true;
    setMaleCount(gender === "Male" ? 1 : 0);
    setFemaleCount(gender === "Female" ? 1 : 0);
  };

  const resetForm = () => {
    hasAppliedGenderDefault.current = false;
    setSelectedMawkibId(null);
    setSelectedPilgrimId(null);
    setSelectedPilgrimMobile("");
    setEditingReservationId(null);
    setPilgrimQuery("");
    setShowNewPilgrimForm(true);
    setNewPilgrimName("");
    setNewPilgrimMobile("");
    setStartDate(todayPersian);
    setEndDate(tomorrowPersian);
    setDurationDays(1);
    setMaleCount(0);
    setFemaleCount(0);
  };

  const openNewReservation = () => {
    resetForm();
    setShowForm(true);
  };

  const openReservation = (reservation: Reservation) => {
    resetForm();
    hasAppliedGenderDefault.current = true;
    setEditingReservationId(reservation.id);
    setSelectedMawkibId(reservation.mawkibId);
    setSelectedPilgrimId(reservation.pilgrimUserId);
    setSelectedPilgrimMobile(reservation.pilgrimMobile);
    setShowNewPilgrimForm(false);
    setPilgrimQuery(reservation.pilgrimName ?? reservation.pilgrimMobile);
    const reservationStartDate = formatPersianDate(reservation.reservationDate);
    const reservationEndDate = formatPersianDate(reservation.reservationEndDate);
    setStartDate(reservationStartDate);
    setEndDate(reservationEndDate);
    setDurationDays(getStayDuration(reservationStartDate, reservationEndDate));
    setMaleCount(reservation.maleGuestCount);
    setFemaleCount(reservation.femaleGuestCount);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  useEffect(() => {
    const requestId = reservationParams.reservationRequestId;
    if (!requestId || handledReservationRequest.current === requestId) {
      return;
    }

    const pilgrimId = Number(reservationParams.pilgrimId);
    const mawkibId = Number(reservationParams.mawkibId);
    const hasPilgrim = Number.isFinite(pilgrimId) && pilgrimId > 0;
    const hasMawkib = Number.isFinite(mawkibId) && mawkibId > 0;

    if (!hasPilgrim && !hasMawkib) {
      return;
    }

    handledReservationRequest.current = requestId;
    resetForm();

    if (hasMawkib) {
      setSelectedMawkibId(mawkibId);
    }

    if (hasPilgrim) {
      setSelectedPilgrimId(pilgrimId);
      setSelectedPilgrimMobile(reservationParams.pilgrimMobile ?? "");
      setPilgrimQuery(
        reservationParams.pilgrimName ??
          reservationParams.pilgrimMobile ??
          "",
      );
      applyPilgrimGenderDefault(
        reservationParams.pilgrimGender === "Male" ||
          reservationParams.pilgrimGender === "Female"
          ? reservationParams.pilgrimGender
          : null,
      );
      setShowNewPilgrimForm(false);
    }

    setShowForm(true);
  }, [
    reservationParams.mawkibId,
    reservationParams.pilgrimId,
    reservationParams.pilgrimGender,
    reservationParams.pilgrimMobile,
    reservationParams.pilgrimName,
    reservationParams.reservationRequestId,
  ]);

  const updateStartDate = (value: string) => {
    setStartDate(value);
    const calculatedEndDate = addDaysToPersianDate(value, durationDays || 1);
    if (calculatedEndDate) setEndDate(calculatedEndDate);
  };

  const selectDuration = (days: number) => {
    setDurationDays(days);
    const calculatedEndDate = addDaysToPersianDate(startDate, days);
    if (calculatedEndDate) setEndDate(calculatedEndDate);
  };

  const updateEndDate = (value: string) => {
    setEndDate(value);
    setDurationDays(getStayDuration(startDate, value));
  };

  const { data: reservations = [], isLoading, isFetching } = useQuery({
    queryKey: ["reservations", user?.id, debouncedQuery],
    enabled: !!user,
    placeholderData: keepPreviousData,
    queryFn: () =>
      listReservations(user!.id, { query: debouncedQuery || undefined }),
  });

  const mawkibsQuery = useQuery({
    queryKey: ["mawkibs", user?.id],
    enabled: !!user && showForm,
    queryFn: () => listMawkibs(user!.id),
  });

  useEffect(() => {
    if (
      showForm &&
      selectedMawkibId === null &&
      mawkibsQuery.data?.length === 1
    ) {
      setSelectedMawkibId(mawkibsQuery.data[0].id);
    }
  }, [mawkibsQuery.data, selectedMawkibId, showForm]);

  const pilgrimsQuery = useQuery({
    queryKey: ["pilgrims-options", user?.id],
    enabled: !!user && showForm,
    queryFn: () => listPilgrims(user!.id),
  });

  const filteredPilgrims = useMemo(() => {
    const normalizedQuery = pilgrimQuery.trim().toLocaleLowerCase("fa");
    const pilgrims = pilgrimsQuery.data ?? [];
    if (!normalizedQuery) return [];

    return pilgrims
      .filter((pilgrim) =>
        [pilgrim.fullName, pilgrim.mobileNumber, pilgrim.nationalId]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("fa").includes(normalizedQuery),
          ),
      )
      .slice(0, 10);
  }, [pilgrimQuery, pilgrimsQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMawkibId) {
        throw new Error("موکب را انتخاب کنید");
      }

      let pilgrimId = selectedPilgrimId;
      let pilgrimMobile = selectedPilgrimMobile;
      let pilgrimGender: UserGender | null | undefined;

      if (showNewPilgrimForm) {
        let pilgrim = await getPilgrimByMobile(newPilgrimMobile);
        if (!pilgrim) {
          pilgrim = await createPilgrim({
            fullName: newPilgrimName,
            mobileNumber: newPilgrimMobile,
          });
        }
        pilgrimId = pilgrim.id;
        pilgrimMobile = pilgrim.mobileNumber;
        pilgrimGender = pilgrim.gender;
      } else {
        const pilgrim = pilgrimsQuery.data?.find((p) => p.id === pilgrimId);
        pilgrimMobile ||= pilgrim?.mobileNumber ?? "";
        pilgrimGender = pilgrim?.gender;
      }

      if (!pilgrimId || !pilgrimMobile) {
        throw new Error("زائر را انتخاب کنید");
      }
      const reservationDate = parsePersianDate(startDate);
      const reservationEndDate = parsePersianDate(endDate);
      if (!reservationDate || !reservationEndDate) {
        throw new Error("تاریخ‌ها را با قالب شمسی ۱۴۰۵/۰۴/۲۰ وارد کنید");
      }
      if (reservationEndDate < reservationDate) {
        throw new Error("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد");
      }

      const shouldApplyGenderDefault =
        !editingReservationId &&
        maleCount === 0 &&
        femaleCount === 0 &&
        !!pilgrimGender;
      const input = {
        mawkibId: selectedMawkibId,
        pilgrimUserId: pilgrimId,
        reservationDate,
        reservationEndDate,
        maleGuestCount: shouldApplyGenderDefault
          ? pilgrimGender === "Male"
            ? 1
            : 0
          : maleCount,
        femaleGuestCount: shouldApplyGenderDefault
          ? pilgrimGender === "Female"
            ? 1
            : 0
          : femaleCount,
        pilgrimMobile,
      };

      if (editingReservationId) {
        return updateReservation(user!.id, editingReservationId, input);
      }

      return createReservation(user!.id, {
        ...input,
        status: "Confirmed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["pilgrims"] });
      queryClient.invalidateQueries({ queryKey: ["pilgrims-options"] });
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReservation(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      if (showForm) closeForm();
      notify("موفق", "رزرو حذف شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelReservation(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const extendMutation = useMutation({
    mutationFn: async () => {
      if (!extendingReservation) throw new Error("رزرو انتخاب نشده است");

      const reservationDate = parsePersianDate(extendStartDate);
      const reservationEndDate = parsePersianDate(extendEndDate);
      if (!reservationDate || !reservationEndDate) {
        throw new Error("تاریخ‌ها را با قالب شمسی ۱۴۰۵/۰۴/۲۰ وارد کنید");
      }
      if (reservationEndDate < reservationDate) {
        throw new Error("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد");
      }

      return updateReservation(user!.id, extendingReservation.id, {
        reservationDate,
        reservationEndDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setExtendingReservation(null);
      notify("موفق", "رزرو تمدید شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const openExtendModal = (reservation: Reservation) => {
    const start = formatPersianDate(reservation.reservationEndDate);
    const end = addDaysToPersianDate(start, 1) ?? start;
    setExtendingReservation(reservation);
    setExtendStartDate(start);
    setExtendEndDate(end);
    setExtendDurationDays(1);
  };

  const applyExtendDuration = (days: number) => {
    setExtendDurationDays(days);
    const nextEnd = addDaysToPersianDate(extendStartDate, days);
    if (nextEnd) setExtendEndDate(nextEnd);
  };

  const handleExtendStartDateChange = (value: string) => {
    setExtendStartDate(value);
    const nextEnd = addDaysToPersianDate(value, extendDurationDays);
    if (nextEnd) setExtendEndDate(nextEnd);
  };

  const openPilgrimCard = async (reservationId: number) => {
    if (!user) return;
    try {
      setCardModalVisible(true);
      setCardLoading(true);
      setCardDetails(null);
      const details = await getPilgrimCardDetails(user.id, reservationId);
      setCardDetails(details);
    } catch (error) {
      setCardModalVisible(false);
      notify("خطا", error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setCardLoading(false);
    }
  };

  const handleSendSms = async (reservation: Reservation) => {
    if (!user) return;
    try {
      setSmsLoadingId(reservation.id);
      const details = await getPilgrimCardDetails(user.id, reservation.id);
      await openReservationSms({
        trackingCode: reservation.trackingCode,
        pilgrimMobile: reservation.pilgrimMobile,
        mawkibName: details?.mawkibName ?? reservation.mawkibName,
        mawkib: details
          ? {
              name: details.mawkibName,
              address: details.mawkibAddress,
              neshanAddressUrl: details.neshanAddressUrl,
            }
          : null,
      });
    } catch (error) {
      notify("خطا", error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setSmsLoadingId(null);
    }
  };

  const handleCancelReservation = (reservation: Reservation) => {
    if (reservation.status === "Cancelled") {
      notify("توجه", "این رزرو قبلاً لغو شده است");
      return;
    }

    notify("لغو رزرو", "آیا از لغو این رزرو مطمئن هستید؟", [
      { text: "انصراف", style: "cancel" },
      {
        text: "لغو رزرو",
        style: "destructive",
        onPress: () => cancelMutation.mutate(reservation.id),
      },
    ]);
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    notify(
      "حذف رزرو",
      `آیا از حذف رزرو «${reservation.trackingCode}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => deleteMutation.mutate(reservation.id),
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <AppHeader
        title={
          showForm
            ? editingReservationId
              ? "ویرایش رزرو"
              : "رزرو جدید"
            : "رزروها"
        }
        subtitle={showForm ? undefined : "مدیریت و جستجوی رزرو"}
        onBack={showForm ? closeForm : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={!showForm ? [0] : undefined}
      >
        {!showForm ? (
          <SearchBarStickyWrap>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="کد رزرو، نام زائر یا موبایل"
            />
          </SearchBarStickyWrap>
        ) : null}
        {showForm ? (
          <View style={styles.form}>
            <View style={styles.formTitleRow}>
              <Text style={styles.formHeading}>
                {editingReservationId
                  ? "مشاهده و ویرایش رزرو"
                  : "رزرو جدید"}
              </Text>
            </View>
            <View style={styles.formTitleRow}>
              <Text style={styles.formTitle}>انتخاب موکب</Text>
            </View>
            {(mawkibsQuery.data ?? []).map((mawkib) => (
              <PrimaryButton
                key={mawkib.id}
                label={mawkib.name}
                variant={
                  selectedMawkibId === mawkib.id ? "primary" : "secondary"
                }
                compact
                onPress={() => setSelectedMawkibId(mawkib.id)}
              />
            ))}
            <View style={styles.sectionDivider} />

            <View style={styles.pilgrimSectionHeader}>
              <PrimaryButton
                label={showNewPilgrimForm ? "جستجوی زائر" : "زائر جدید"}
                icon={showNewPilgrimForm ? "search" : "person-add-outline"}
                variant="secondary"
                style={styles.pilgrimModeButton}
                compact
                onPress={() => {
                  setShowNewPilgrimForm((current) => !current);
                  setSelectedPilgrimId(null);
                  setSelectedPilgrimMobile("");
                  setPilgrimQuery("");
                }}
              />
              <View style={styles.pilgrimSectionTitleWrap}>
                <Text style={styles.formTitle}>
                  {showNewPilgrimForm ? "انتخاب زائر جدید" : "انتخاب زائر"}
                </Text>
              </View>
            </View>
            {showNewPilgrimForm ? (
              <View style={styles.newPilgrimForm}>
                <AppInput
                  label="نام و نام خانوادگی"
                  value={newPilgrimName}
                  onChangeText={setNewPilgrimName}
                />
                <AppInput
                  label="شماره تلفن همراه"
                  value={newPilgrimMobile}
                  onChangeText={setNewPilgrimMobile}
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <>
                <AppInput
                  label="جستجوی زائر"
                  value={pilgrimQuery}
                  onChangeText={setPilgrimQuery}
                  placeholder="نام، موبایل یا کد ملی"
                />
                <View style={styles.pilgrimList}>
                  {!pilgrimQuery.trim() ? (
                    <Text style={styles.noResult}>
                      برای نمایش نتایج، نام یا شماره زائر را جستجو کنید.
                    </Text>
                  ) : filteredPilgrims.length === 0 ? (
                    <Text style={styles.noResult}>زائری یافت نشد</Text>
                  ) : (
                    filteredPilgrims.map((pilgrim) => (
                      <PrimaryButton
                        key={pilgrim.id}
                        label={`${pilgrim.fullName} • ${pilgrim.mobileNumber}`}
                        variant={
                          selectedPilgrimId === pilgrim.id
                            ? "primary"
                            : "secondary"
                        }
                        compact
                        onPress={() => {
                          setSelectedPilgrimId(pilgrim.id);
                          setSelectedPilgrimMobile(pilgrim.mobileNumber);
                          setPilgrimQuery(pilgrim.fullName);
                          applyPilgrimGenderDefault(pilgrim.gender);
                        }}
                      />
                    ))
                  )}
                </View>
              </>
            )}
            <View style={styles.sectionDivider} />

            <View style={styles.formTitleRow}>
              <Text style={styles.sectionHeading}>تاریخ و مدت اقامت</Text>
            </View>
            <View style={styles.durationOptions}>
              {[1, 2, 3, 4].map((days) => (
                <DurationButton
                  key={days}
                  days={days}
                  selected={durationDays === days}
                  onPress={() => selectDuration(days)}
                />
              ))}
            </View>
            <AppInput
              label="تاریخ شروع اقامت"
              value={startDate}
              onChangeText={updateStartDate}
              placeholder="۱۴۰۵/۰۴/۲۰"
            />
            <AppInput
              label="تاریخ پایان اقامت"
              value={endDate}
              onChangeText={updateEndDate}
              placeholder="۱۴۰۵/۰۴/۲۰"
            />
            <GuestCounter
              label="مرد"
              icon="male-outline"
              value={maleCount}
              onChange={setMaleCount}
            />
            <GuestCounter
              label="زن"
              icon="female-outline"
              value={femaleCount}
              onChange={setFemaleCount}
            />
            {editingReservationId ? (
              <PrimaryButton
                label="حذف رزرو"
                icon="trash-outline"
                variant="danger"
                loading={deleteMutation.isPending}
                compact
                onPress={() =>
                  notify(
                    "حذف رزرو",
                    "آیا از حذف این رزرو مطمئن هستید؟",
                    [
                      { text: "انصراف", style: "cancel" },
                      {
                        text: "حذف",
                        style: "destructive",
                        onPress: () =>
                          deleteMutation.mutate(editingReservationId),
                      },
                    ],
                  )
                }
              />
            ) : null}
          </View>
        ) : null}

        {!showForm && isLoading && reservations.length === 0 ? (
          <Text style={styles.loading}>در حال بارگذاری...</Text>
        ) : !showForm && reservations.length === 0 && !isFetching ? (
          <EmptyState
            icon="calendar-outline"
            title="رزروی ثبت نشده"
            description="برای شروع یک رزرو جدید ایجاد کنید."
          />
        ) : !showForm ? (
          reservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationItem}>
              <ListCard
                title={reservation.pilgrimName ?? "زائر"}
                titleIcon="person-outline"
                badge={reservationStatusLabel[reservation.status]}
                badgeColor={
                  reservation.status === "Confirmed"
                    ? colors.success
                    : reservation.status === "Pending"
                      ? colors.warning
                      : reservation.status === "Cancelled"
                        ? colors.danger
                        : colors.primary
                }
                badgeTextColor="#fff"
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
                footer={
                  <View style={styles.itemActions}>
                    <PrimaryButton
                      label="ویرایش"
                      icon="create-outline"
                      variant="secondary"
                      compact
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => openReservation(reservation)}
                    />
                    <PrimaryButton
                      label="زائر کارت"
                      icon="card-outline"
                      variant="secondary"
                      compact
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => openPilgrimCard(reservation.id)}
                    />
                    <PrimaryButton
                      label="امانت"
                      icon="briefcase-outline"
                      variant="secondary"
                      compact
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() =>
                        router.push({
                          pathname: "/menu/delivered-items",
                          params: {
                            reservationId: String(reservation.id),
                            pilgrimName: reservation.pilgrimName ?? "",
                            trackingCode: reservation.trackingCode,
                          },
                        })
                      }
                    />
                    <PrimaryButton
                      label="برنامه غذایی"
                      icon="restaurant-outline"
                      variant="secondary"
                      compact
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() =>
                        router.push({
                          pathname: "/menu/meal-plan",
                          params: {
                            reservationId: String(reservation.id),
                            pilgrimName: reservation.pilgrimName ?? "",
                            trackingCode: reservation.trackingCode,
                          },
                        })
                      }
                    />
                    <PrimaryButton
                      label="پیامک"
                      icon="chatbubble-outline"
                      variant="secondary"
                      compact
                      loading={smsLoadingId === reservation.id}
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => handleSendSms(reservation)}
                    />
                    <PrimaryButton
                      label="تمدید"
                      icon="calendar-outline"
                      variant="secondary"
                      compact
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => openExtendModal(reservation)}
                    />
                    <PrimaryButton
                      label="لغو"
                      icon="close-circle-outline"
                      variant="dangerOutline"
                      compact
                      disabled={reservation.status === "Cancelled"}
                      loading={cancelMutation.isPending}
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => handleCancelReservation(reservation)}
                    />
                    <PrimaryButton
                      label="حذف"
                      icon="trash-outline"
                      variant="dangerOutline"
                      compact
                      loading={deleteMutation.isPending}
                      style={styles.itemAction}
                      labelStyle={styles.itemActionLabel}
                      onPress={() => handleDeleteReservation(reservation)}
                    />
                  </View>
                }
              />
            </View>
          ))
        ) : null}
      </ScrollView>
      {showForm ? (
        <StickyBottomAction>
          <PrimaryButton
            label={editingReservationId ? "ذخیره تغییرات" : "ثبت رزرو"}
            icon={editingReservationId ? "save-outline" : "checkmark"}
            loading={createMutation.isPending}
            compact
            onPress={() => createMutation.mutate()}
          />
        </StickyBottomAction>
      ) : (
        <FloatingActionButton label="رزرو جدید" onPress={openNewReservation} />
      )}
      <PilgrimCardModal
        visible={cardModalVisible}
        details={cardDetails}
        loading={cardLoading}
        onClose={() => {
          setCardModalVisible(false);
          setCardDetails(null);
        }}
      />

      <Modal
        visible={!!extendingReservation}
        animationType="fade"
        transparent
        onRequestClose={() => setExtendingReservation(null)}
      >
        <View style={styles.extendOverlay}>
          <View style={styles.extendModal}>
            <Text style={styles.extendTitle}>تمدید رزرو</Text>
            {extendingReservation ? (
              <Text style={styles.extendSubtitle}>
                {extendingReservation.pilgrimName ?? "زائر"} •{" "}
                {extendingReservation.trackingCode}
              </Text>
            ) : null}

            <View style={styles.durationOptions}>
              {[1, 2, 3].map((days) => (
                <DurationButton
                  key={days}
                  days={days}
                  selected={extendDurationDays === days}
                  onPress={() => applyExtendDuration(days)}
                />
              ))}
            </View>

            <AppInput
              label="تاریخ شروع"
              value={extendStartDate}
              onChangeText={handleExtendStartDateChange}
              placeholder="۱۴۰۵/۰۴/۲۰"
            />
            <AppInput
              label="تاریخ پایان"
              value={extendEndDate}
              onChangeText={(value) => {
                setExtendEndDate(value);
                setExtendDurationDays(
                  getStayDuration(extendStartDate, value),
                );
              }}
              placeholder="۱۴۰۵/۰۴/۲۱"
            />

            <View style={styles.extendActions}>
              <PrimaryButton
                label="انصراف"
                variant="secondary"
                compact
                style={styles.extendAction}
                onPress={() => setExtendingReservation(null)}
              />
              <PrimaryButton
                label="ثبت تمدید"
                icon="checkmark"
                compact
                loading={extendMutation.isPending}
                style={styles.extendAction}
                onPress={() => extendMutation.mutate()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  reservationItem: {
    marginBottom: 0,
  },
  itemActions: {
    direction: "ltr",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemAction: {
    width: "48%",
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
  },
  itemActionLabel: {
    fontSize: 11,
  },
  extendOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    paddingHorizontal: spacing.lg,
  },
  extendModal: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  extendTitle: {
    ...formTypography.heading,
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
  },
  extendSubtitle: {
    color: colors.textSubtle,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
    fontSize: 13,
  },
  extendActions: {
    direction: "ltr",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  extendAction: {
    flex: 1,
  },
  form: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  formTitle: {
    ...formTypography.title,
    color: colors.text,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  formHeading: {
    width: "100%",
    paddingBottom: spacing.sm,
    ...formTypography.heading,
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
  },
  formTitleRow: {
    width: "100%",
    direction: "ltr",
    alignItems: "flex-end",
  },
  pilgrimSectionHeader: {
    width: "100%",
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pilgrimModeButton: {
    width: "45%",
  },
  pilgrimSectionTitleWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  sectionDivider: {
    width: "100%",
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  sectionHeading: {
    width: "100%",
    ...formTypography.heading,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  durationOptions: {
    width: "100%",
    direction: "rtl",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  durationButton: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: 2,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  durationButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  durationButtonPressed: {
    opacity: 0.75,
  },
  durationButtonText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    writingDirection: "rtl",
  },
  durationButtonTextSelected: {
    color: "#fff",
  },
  pilgrimList: {
    gap: spacing.sm,
  },
  newPilgrimForm: {
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  noResult: {
    width: "100%",
    paddingVertical: spacing.md,
    textAlign: "right",
    writingDirection: "rtl",
    color: colors.textMuted,
  },
  counterRow: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  counterLabel: {
    ...formTypography.body,
    color: colors.text,
    fontWeight: "500",
    textAlign: "right",
    writingDirection: "rtl",
  },
  counterTitle: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  counterControls: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  counterButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  counterButtonPressed: {
    opacity: 0.7,
  },
  counterValue: {
    minWidth: 28,
    ...formTypography.heading,
    color: colors.text,
    textAlign: "center",
    writingDirection: "rtl",
  },
  loading: {
    textAlign: "center",
    writingDirection: "rtl",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
