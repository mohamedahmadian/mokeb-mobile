import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { ListTotalCounter } from "@/src/components/ListTotalCounter";
import { PersianDateField } from "@/src/components/PersianDateField";
import { LocationFields } from "@/src/components/LocationFields";
import { CarPlateInput } from "@/src/components/CarPlateInput";
import { PilgrimCardModal } from "@/src/components/PilgrimCardModal";
import { PendingDeliveredItemsCheckoutModal } from "@/src/components/PendingDeliveredItemsCheckoutModal";
import {
  AppInput,
  EmptyState,
  ListCard,
  PrimaryButton,
  ScreenContainer,
  ScreenScroll,
  SearchBar,
  SearchToolbar,
  SearchToolbarField,
  StickyBottomAction,
  ToolbarIconButton,
} from "@/src/components/ui";
import { ReservationFiltersModal } from "@/src/components/ReservationFiltersModal";
import { useAuth } from "@/src/contexts/AuthContext";
import type { AlertButton } from "@/src/contexts/NotifyContext";
import { useNotifyContext } from "@/src/contexts/NotifyContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { useTabRefresh } from "@/src/hooks/useTabRefresh";
import { useAppBackHandler } from "@/src/hooks/useAppBackHandler";
import { formatPersianDateTime } from "@/src/lib/format-time";
import { notify } from "@/src/lib/notify";
import { reservationStatusLabel } from "@/src/lib/labels";
import {
  createEmptyReservationFilterForm,
  hasActiveReservationFilters,
  reservationFilterFormToListFilters,
  reservationListFiltersToForm,
} from "@/src/lib/reservation-filters";
import {
  addDaysToPersianDate,
  formatPersianDate,
  parsePersianDate,
} from "@/src/lib/persianDate";
import { carPlateToProfileFields } from "@/src/lib/carPlate";
import { colors, formTypography, spacing } from "@/src/lib/theme";
import { openReservationSms } from "@/src/lib/reservation-track";
import {
  getAttendanceActionVisibility,
  recordAttendanceEvent,
} from "@/src/services/attendance";
import { listPendingDeliveredItemsByReservation } from "@/src/services/delivered-items";
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
  countReservations,
  createReservation,
  deleteReservation,
  extendReservation,
  getPilgrimCardDetails,
  listReservations,
  updateReservation,
} from "@/src/services/reservations";

const todayIso = new Date().toISOString().slice(0, 10);
const todayPersian = formatPersianDate(todayIso);
const tomorrowPersian = addDaysToPersianDate(todayPersian, 1) ?? todayPersian;
const RESERVATIONS_PAGE_SIZE = 20;

function getReservationsNextPageParam(
  lastPage: Reservation[] | undefined,
  allPages: Reservation[][] | undefined,
) {
  if (!Array.isArray(lastPage) || lastPage.length < RESERVATIONS_PAGE_SIZE) {
    return undefined;
  }
  return (allPages?.length ?? 0) * RESERVATIONS_PAGE_SIZE;
}

type PilgrimExtraInfo = {
  gender: UserGender | "";
  nationalId: string;
  country: string;
  province: string;
  city: string;
  plateTwoDigit: string;
  plateSerial: string;
  plateProvince: string;
  passportNumber: string;
  address: string;
};

function createEmptyPilgrimExtraInfo(): PilgrimExtraInfo {
  return {
    gender: "",
    nationalId: "",
    country: "ایران",
    province: "",
    city: "",
    plateTwoDigit: "",
    plateSerial: "",
    plateProvince: "",
    passportNumber: "",
    address: "",
  };
}

function GuestCounter({
  label,
  icon,
  value,
  selected,
  onSelect,
  onChange,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  selected?: boolean;
  onSelect: () => void;
  onChange: (value: number) => void;
}) {
  return (
    <View style={[styles.counterRow, selected && styles.counterRowSelected]}>
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          styles.counterTitle,
          pressed && styles.counterTitlePressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`انتخاب ${label}`}
        accessibilityState={{ selected: !!selected }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? colors.primary : colors.textMuted}
        />
        <Text
          style={[styles.counterLabel, selected && styles.counterLabelSelected]}
        >
          {label}
        </Text>
      </Pressable>
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

function getExtensionDaysFromCurrentEnd(currentEnd: string, newEnd: string) {
  const baseIso = parsePersianDate(currentEnd);
  const targetIso = parsePersianDate(newEnd);
  if (!baseIso || !targetIso) return 0;

  const difference =
    (Date.parse(`${targetIso}T00:00:00.000Z`) -
      Date.parse(`${baseIso}T00:00:00.000Z`)) /
    86_400_000;
  return difference >= 1 && difference <= 3 ? difference : 0;
}

export default function ReservationsScreen() {
  const { user, ownerId, canDelete, canCancel } = useAuth();
  const { showActions } = useNotifyContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reservationParams = useLocalSearchParams<{
    pilgrimId?: string;
    pilgrimName?: string;
    pilgrimMobile?: string;
    pilgrimGender?: UserGender | "";
    mawkibId?: string;
    reservationRequestId?: string;
    reservationAction?: string;
  }>();
  const handledReservationRequest = useRef<string | null>(null);
  const hasAppliedGenderDefault = useRef(false);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftFilters, setDraftFilters] = useState(
    createEmptyReservationFilterForm,
  );
  const [appliedFilters, setAppliedFilters] = useState(
    createEmptyReservationFilterForm,
  );
  const listFilters = useMemo(
    () => reservationFilterFormToListFilters(appliedFilters),
    [appliedFilters],
  );
  const hasFilters = hasActiveReservationFilters(listFilters);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [selectedMawkibId, setSelectedMawkibId] = useState<number | null>(null);
  const [selectedPilgrimId, setSelectedPilgrimId] = useState<number | null>(
    null,
  );
  const [selectedPilgrimMobile, setSelectedPilgrimMobile] = useState("");
  const [editingReservationId, setEditingReservationId] = useState<
    number | null
  >(null);
  const [pilgrimQuery, setPilgrimQuery] = useState("");
  const [showNewPilgrimForm, setShowNewPilgrimForm] = useState(true);
  const [newPilgrimName, setNewPilgrimName] = useState("");
  const [newPilgrimMobile, setNewPilgrimMobile] = useState("");
  const [pilgrimExtraInfo, setPilgrimExtraInfo] = useState(
    createEmptyPilgrimExtraInfo,
  );
  const [showPilgrimExtraInfo, setShowPilgrimExtraInfo] = useState(false);
  const [pilgrimSearchFocusTick, setPilgrimSearchFocusTick] = useState(0);
  const [trackingCode, setTrackingCode] = useState("");
  const [reservationDescription, setReservationDescription] = useState("");
  const [startDate, setStartDate] = useState(todayPersian);
  const [endDate, setEndDate] = useState(tomorrowPersian);
  const [durationDays, setDurationDays] = useState(1);
  const [maleCount, setMaleCount] = useState(1);
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
  const [extendCurrentEndDate, setExtendCurrentEndDate] = useState(todayPersian);
  const [extendEndDate, setExtendEndDate] = useState(tomorrowPersian);
  const [extendDurationDays, setExtendDurationDays] = useState(1);
  const [finalCheckoutReservation, setFinalCheckoutReservation] =
    useState<Reservation | null>(null);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<number | null>(
    null,
  );

  useAppBackHandler(() => {
    setExtendingReservation(null);
    return true;
  }, !!extendingReservation);

  const applyPilgrimGenderDefault = (gender?: UserGender | null) => {
    if (hasAppliedGenderDefault.current || !gender) return;

    hasAppliedGenderDefault.current = true;
    setMaleCount(gender === "Male" ? 1 : 0);
    setFemaleCount(gender === "Female" ? 1 : 0);
    setPilgrimExtraInfo((current) => ({ ...current, gender }));
  };

  const updatePilgrimExtraField = <K extends keyof PilgrimExtraInfo>(
    field: K,
    value: PilgrimExtraInfo[K],
  ) => {
    setPilgrimExtraInfo((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    hasAppliedGenderDefault.current = false;
    setFormStep(1);
    setSelectedMawkibId(null);
    setSelectedPilgrimId(null);
    setSelectedPilgrimMobile("");
    setEditingReservationId(null);
    setPilgrimQuery("");
    setShowNewPilgrimForm(true);
    setNewPilgrimName("");
    setNewPilgrimMobile("");
    setPilgrimExtraInfo(createEmptyPilgrimExtraInfo());
    setShowPilgrimExtraInfo(false);
    setPilgrimSearchFocusTick(0);
    setTrackingCode("");
    setReservationDescription("");
    setStartDate(todayPersian);
    setEndDate(tomorrowPersian);
    setDurationDays(1);
    setMaleCount(1);
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
    const reservationEndDate = formatPersianDate(
      reservation.reservationEndDate,
    );
    setStartDate(reservationStartDate);
    setEndDate(reservationEndDate);
    setDurationDays(getStayDuration(reservationStartDate, reservationEndDate));
    setMaleCount(reservation.maleGuestCount);
    setFemaleCount(reservation.femaleGuestCount);
    setReservationDescription(reservation.description ?? "");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleFormBack = () => {
    if (formStep === 2) {
      setFormStep(1);
      return;
    }
    closeForm();
  };

  const goToStep2 = () => {
    if (!selectedMawkibId) {
      notify("توجه", "لطفاً موکب را انتخاب کنید");
      return;
    }

    if (showNewPilgrimForm) {
      if (!newPilgrimName.trim() || !newPilgrimMobile.trim()) {
        notify("توجه", "نام و شماره موبایل زائر را وارد کنید");
        return;
      }
    } else if (!selectedPilgrimId) {
      notify("توجه", "لطفاً زائر را انتخاب کنید");
      return;
    }

    setFormStep(2);
  };

  useEffect(() => {
    if (!showForm || formStep !== 2) return;

    if (maleCount === 1 && femaleCount === 0) {
      setPilgrimExtraInfo((current) =>
        current.gender === "Male" ? current : { ...current, gender: "Male" },
      );
    } else if (femaleCount === 1 && maleCount === 0) {
      setPilgrimExtraInfo((current) =>
        current.gender === "Female"
          ? current
          : { ...current, gender: "Female" },
      );
    }
  }, [showForm, formStep, maleCount, femaleCount]);

  useEffect(() => {
    const requestId = reservationParams.reservationRequestId;
    if (!requestId || handledReservationRequest.current === requestId) {
      return;
    }

    const openHistory = reservationParams.reservationAction === "history";
    if (openHistory) {
      handledReservationRequest.current = requestId;
      setShowForm(false);
      resetForm();
      setQuery(
        reservationParams.pilgrimMobile?.trim() ||
          reservationParams.pilgrimName?.trim() ||
          "",
      );
      return;
    }

    if (reservationParams.reservationAction === "search") {
      handledReservationRequest.current = requestId;
      setShowForm(false);
      resetForm();
      setQuery("");
      return;
    }

    const pilgrimId = Number(reservationParams.pilgrimId);
    const mawkibId = Number(reservationParams.mawkibId);
    const hasPilgrim = Number.isFinite(pilgrimId) && pilgrimId > 0;
    const hasMawkib = Number.isFinite(mawkibId) && mawkibId > 0;
    const openBlankForm = reservationParams.reservationAction === "new";

    if (!hasPilgrim && !hasMawkib && !openBlankForm) {
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
        reservationParams.pilgrimName ?? reservationParams.pilgrimMobile ?? "",
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
    reservationParams.reservationAction,
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

  const {
    data: reservationsPages,
    isLoading: isReservationsLoading,
    isFetching: isReservationsFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchReservations,
  } = useInfiniteQuery({
    queryKey: ["reservations", "infinite", ownerId, searchQuery, listFilters],
    enabled: !!ownerId && !showForm,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      if (!ownerId) return Promise.resolve([]);
      return listReservations(ownerId, {
        query: searchQuery || undefined,
        ...listFilters,
        limit: RESERVATIONS_PAGE_SIZE,
        offset: pageParam,
      });
    },
    getNextPageParam: getReservationsNextPageParam,
  });

  const reservations = useMemo(
    () => reservationsPages?.pages.flatMap((page) => page ?? []) ?? [],
    [reservationsPages],
  );

  const loadingMoreRef = useRef(false);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasNextPage || isFetchingNextPage || loadingMoreRef.current) return;

      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromBottom < 160) {
        loadingMoreRef.current = true;
        void fetchNextPage().finally(() => {
          loadingMoreRef.current = false;
        });
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const { data: totalReservations = 0, refetch: refetchReservationCount } =
    useQuery({
      queryKey: ["reservations-count", ownerId],
      enabled: !!ownerId && !showForm,
      queryFn: () => countReservations(ownerId!),
    });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([refetchReservations(), refetchReservationCount()]);
  });

  useTabRefresh({
    onReset: () => {
      closeForm();
      setFilterModalVisible(false);
      setExtendingReservation(null);
      setFinalCheckoutReservation(null);
      setCardModalVisible(false);
    },
    onRefresh: () => {
      void queryClient.invalidateQueries({ queryKey: ["reservations"] });
      void queryClient.invalidateQueries({ queryKey: ["reservations-count"] });
    },
  });

  const mawkibsQuery = useQuery({
    queryKey: ["mawkibs", ownerId],
    enabled: !!ownerId && showForm,
    queryFn: () => listMawkibs(ownerId!),
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

  const mawkibs = mawkibsQuery.data ?? [];
  const hideMawkibPicker = mawkibs.length === 1;

  const pilgrimsQuery = useQuery({
    queryKey: ["pilgrims-options", ownerId],
    enabled: !!ownerId && showForm,
    queryFn: () => listPilgrims(ownerId!),
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

      if (showNewPilgrimForm) {
        let pilgrim = await getPilgrimByMobile(newPilgrimMobile);
        if (!pilgrim) {
          const plateFields = carPlateToProfileFields({
            plateTwoDigit: pilgrimExtraInfo.plateTwoDigit,
            plateSerial: pilgrimExtraInfo.plateSerial,
            plateProvince: pilgrimExtraInfo.plateProvince,
          });
          pilgrim = await createPilgrim({
            fullName: newPilgrimName,
            mobileNumber: newPilgrimMobile,
            gender: pilgrimExtraInfo.gender || null,
            nationalId: pilgrimExtraInfo.nationalId,
            country: pilgrimExtraInfo.country,
            province: pilgrimExtraInfo.province,
            city: pilgrimExtraInfo.city,
            carPlate: plateFields.carPlate ?? undefined,
            plateTwoDigit: plateFields.plateTwoDigit || undefined,
            plateSerial: plateFields.plateSerial || undefined,
            plateProvince: plateFields.plateProvince || undefined,
            passportNumber: pilgrimExtraInfo.passportNumber,
            address: pilgrimExtraInfo.address,
          });
        }
        pilgrimId = pilgrim.id;
        pilgrimMobile = pilgrim.mobileNumber;
      } else {
        const pilgrim = pilgrimsQuery.data?.find((p) => p.id === pilgrimId);
        pilgrimMobile ||= pilgrim?.mobileNumber ?? "";
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

      const input = {
        mawkibId: selectedMawkibId,
        pilgrimUserId: pilgrimId,
        reservationDate,
        reservationEndDate,
        maleGuestCount: maleCount,
        femaleGuestCount: femaleCount,
        pilgrimMobile,
        description: reservationDescription.trim() || undefined,
      };

      if (editingReservationId) {
        return updateReservation(ownerId!, editingReservationId, input);
      }

      return createReservation(ownerId!, {
        ...input,
        trackingCode: trackingCode.trim() || undefined,
        status: "Confirmed",
        reservedByUserId: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-count"] });
      queryClient.invalidateQueries({ queryKey: ["pilgrims"] });
      queryClient.invalidateQueries({ queryKey: ["pilgrims-count"] });
      queryClient.invalidateQueries({ queryKey: ["pilgrims-options"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-capacity-day"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-inventory"] });
      closeForm();
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReservation(ownerId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-count"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-capacity-day"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-inventory"] });
      if (showForm) closeForm();
      notify("موفق", "رزرو حذف شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelReservation(ownerId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-count"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-capacity-day"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-inventory"] });
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const checkoutMutation = useMutation({
    mutationFn: (reservationId: number) => {
      setCheckoutLoadingId(reservationId);
      return recordAttendanceEvent(ownerId!, reservationId, "EARLY_CHECKOUT");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-count"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-present"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-absent"] });
      notify("موفق", "خروج نهایی ثبت شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
    onSettled: () => setCheckoutLoadingId(null),
  });

  const extendMutation = useMutation({
    mutationFn: async () => {
      if (!extendingReservation) throw new Error("رزرو انتخاب نشده است");
      if (!ownerId) throw new Error("نشست کاربر معتبر نیست");

      const reservationEndDate = parsePersianDate(extendEndDate);
      if (!reservationEndDate) {
        throw new Error("تاریخ پایان را با قالب شمسی ۱۴۰۵/۰۴/۲۰ وارد کنید");
      }

      return extendReservation(
        ownerId,
        extendingReservation.id,
        reservationEndDate,
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-count"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-capacity-day"] });
      queryClient.invalidateQueries({ queryKey: ["mawkib-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      setExtendingReservation(null);
      notify(
        "موفق",
        `تاریخ پایان رزرو ${updated.trackingCode} به ${formatPersianDate(updated.reservationEndDate)} به‌روزرسانی شد`,
      );
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const openExtendModal = (reservation: Reservation) => {
    const start = formatPersianDate(reservation.reservationDate);
    const currentEnd = formatPersianDate(reservation.reservationEndDate);
    const nextEnd = addDaysToPersianDate(currentEnd, 1) ?? currentEnd;
    setExtendingReservation(reservation);
    setExtendStartDate(start);
    setExtendCurrentEndDate(currentEnd);
    setExtendEndDate(nextEnd);
    setExtendDurationDays(1);
  };

  const openAttendance = (reservation: Reservation) => {
    router.push({
      pathname: "/(tabs)/attendance",
      params: {
        attendanceQuery: reservation.trackingCode,
        attendanceView: "search",
        attendanceRequestId: String(Date.now()),
      },
    });
  };

  const confirmFinalCheckout = (reservation: Reservation) => {
    notify(
      "خروج نهایی",
      `آیا از ثبت خروج نهایی «${reservation.pilgrimName ?? "زائر"}» مطمئن هستید؟ پس از خروج نهایی، رزرو تکمیل می‌شود.`,
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "خروج نهایی",
          style: "destructive",
          onPress: () => checkoutMutation.mutate(reservation.id),
        },
      ],
    );
  };

  const handleFinalCheckout = async (reservation: Reservation) => {
    if (!ownerId) return;

    const pendingItems = await listPendingDeliveredItemsByReservation(
      ownerId,
      reservation.id,
    );

    if (pendingItems.length > 0) {
      setFinalCheckoutReservation(reservation);
      return;
    }

    confirmFinalCheckout(reservation);
  };

  const applyExtendDuration = (days: number) => {
    setExtendDurationDays(days);
    const nextEnd = addDaysToPersianDate(extendCurrentEndDate, days);
    if (nextEnd) setExtendEndDate(nextEnd);
  };

  const openPilgrimCard = async (reservationId: number) => {
    if (!user) return;
    try {
      setCardModalVisible(true);
      setCardLoading(true);
      setCardDetails(null);
      const details = await getPilgrimCardDetails(ownerId!, reservationId);
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
      const details = await getPilgrimCardDetails(ownerId!, reservation.id);
      await openReservationSms({
        trackingCode: reservation.trackingCode,
        pilgrimMobile: reservation.pilgrimMobile,
        pilgrimName: details?.pilgrimName ?? reservation.pilgrimName,
        pilgrimGender: details?.pilgrimGender,
        mawkibName: details?.mawkibName ?? reservation.mawkibName,
        ownerPhone: details?.ownerPhone || details?.mawkibPhone || null,
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

  const openFilterModal = () => {
    setDraftFilters(reservationListFiltersToForm(listFilters));
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setFilterModalVisible(false);
  };

  const submitSearch = () => setSearchQuery(query.trim());

  const showReservationActions = (reservation: Reservation) => {
    const buttons: AlertButton[] = [
      {
        text: "زائر کارت",
        onPress: () => openPilgrimCard(reservation.id),
      },
      {
        text: "امانت",
        onPress: () =>
          router.push({
            pathname: "/reservations/delivered-items",
            params: {
              reservationId: String(reservation.id),
              pilgrimName: reservation.pilgrimName ?? "",
              trackingCode: reservation.trackingCode,
            },
          }),
      },
      {
        text: "برنامه غذایی",
        onPress: () =>
          router.push({
            pathname: "/reservations/meal-plan",
            params: {
              reservationId: String(reservation.id),
              pilgrimName: reservation.pilgrimName ?? "",
              trackingCode: reservation.trackingCode,
            },
          }),
      },
      {
        text: "پیامک",
        onPress: () => handleSendSms(reservation),
      },
      {
        text: "تمدید",
        onPress: () => openExtendModal(reservation),
      },
    ];

    if (getAttendanceActionVisibility(reservation).canFinalCheckout) {
      buttons.push({
        text: "خروج نهایی",
        style: "destructive",
        onPress: () => handleFinalCheckout(reservation),
      });
    }

    buttons.push({
      text: "لغو",
      style: "destructive",
      onPress: () => handleCancelReservation(reservation),
    });

    if (canDelete) {
      buttons.push({
        text: "حذف",
        style: "destructive",
        onPress: () => handleDeleteReservation(reservation),
      });
    }

    buttons.push({ text: "انصراف", style: "cancel" });

    showActions({
      title: reservation.pilgrimName ?? "زائر",
      message: reservation.trackingCode,
      buttons,
    });
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
        subtitle={showForm ? undefined : "مدیریت و جستجوی رزروها"}
        onBack={showForm ? handleFormBack : undefined}
        showLogo={!showForm}
        leftAction={
          !showForm ? (
            <ToolbarIconButton
              icon="options-outline"
              onPress={openFilterModal}
              accessibilityLabel="فیلتر رزروها"
              active={hasFilters}
              showBadge={hasFilters}
            />
          ) : undefined
        }
      />

      {showForm ? (
        <KeyboardAvoidingView
          style={styles.formWizard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={styles.formArea}>
            <View style={styles.form}>
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets
                showsVerticalScrollIndicator
              >
              {formStep === 1 ? (
                <View style={styles.formStepContent}>
                  {!hideMawkibPicker ? (
                    <View style={styles.formStepContent}>
                      <View style={styles.formTitleRow}>
                        <Text style={styles.formTitle}>انتخاب موکب</Text>
                      </View>
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
                      <View style={styles.sectionDivider} />
                    </View>
                  ) : null}
                  <View style={styles.pilgrimSection}>
                    <View style={styles.pilgrimSectionHeader}>
                      <PrimaryButton
                        label={showNewPilgrimForm ? "جستجوی زائر" : "زائر جدید"}
                        icon={
                          showNewPilgrimForm ? "search" : "person-add-outline"
                        }
                        variant="secondary"
                        style={styles.pilgrimModeButton}
                        compact
                        onPress={() => {
                          setShowNewPilgrimForm((current) => {
                            const next = !current;
                            if (!next) {
                              setPilgrimSearchFocusTick((tick) => tick + 1);
                            }
                            return next;
                          });
                          setSelectedPilgrimId(null);
                          setSelectedPilgrimMobile("");
                          setPilgrimQuery("");
                        }}
                      />
                      <View style={styles.pilgrimSectionTitleWrap}>
                        <Text style={styles.formTitle}>
                          {showNewPilgrimForm ? " زائر جدید" : "انتخاب زائر"}
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
                        <Pressable
                          style={({ pressed }) => [
                            styles.collapsibleHeader,
                            pressed && styles.collapsibleHeaderPressed,
                          ]}
                          onPress={() =>
                            setShowPilgrimExtraInfo((current) => !current)
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            expanded: showPilgrimExtraInfo,
                          }}
                          accessibilityLabel="اطلاعات تکمیلی زائر"
                        >
                          <Ionicons
                            name={
                              showPilgrimExtraInfo
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={18}
                            color={colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.collapsibleTitle,
                              {
                                textAlign: "left",
                              },
                            ]}
                          >
                            اطلاعات تکمیلی زائر (اختیاری)
                          </Text>
                        </Pressable>

                        {showPilgrimExtraInfo ? (
                          <View style={styles.pilgrimExtraFields}>
                            <View style={styles.field}>
                              <View style={styles.labelRow}>
                                <Text style={styles.fieldLabel}>جنسیت</Text>
                              </View>
                              <View style={styles.genderRow}>
                                {(
                                  [
                                    ["Male", "مرد"],
                                    ["Female", "زن"],
                                  ] as const
                                ).map(([gender, label]) => {
                                  const selected =
                                    pilgrimExtraInfo.gender === gender;
                                  return (
                                    <Pressable
                                      key={gender}
                                      style={[
                                        styles.genderButton,
                                        selected && styles.genderButtonSelected,
                                      ]}
                                      onPress={() =>
                                        updatePilgrimExtraField(
                                          "gender",
                                          gender,
                                        )
                                      }
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
                            <AppInput
                              label="کد ملی (اختیاری)"
                              value={pilgrimExtraInfo.nationalId}
                              onChangeText={(text) =>
                                updatePilgrimExtraField("nationalId", text)
                              }
                              keyboardType="number-pad"
                            />
                            <AppInput
                              label="کشور"
                              value={pilgrimExtraInfo.country}
                              onChangeText={(text) =>
                                updatePilgrimExtraField("country", text)
                              }
                            />
                            <LocationFields
                              province={pilgrimExtraInfo.province}
                              city={pilgrimExtraInfo.city}
                              onProvinceChange={(text) =>
                                updatePilgrimExtraField("province", text)
                              }
                              onCityChange={(text) =>
                                updatePilgrimExtraField("city", text)
                              }
                            />
                            <AppInput
                              label="شماره گذرنامه"
                              value={pilgrimExtraInfo.passportNumber}
                              onChangeText={(text) =>
                                updatePilgrimExtraField("passportNumber", text)
                              }
                            />
                            <CarPlateInput
                              value={{
                                plateTwoDigit: pilgrimExtraInfo.plateTwoDigit,
                                plateSerial: pilgrimExtraInfo.plateSerial,
                                plateProvince: pilgrimExtraInfo.plateProvince,
                              }}
                              onChange={(plate) =>
                                setPilgrimExtraInfo((current) => ({
                                  ...current,
                                  plateTwoDigit: plate.plateTwoDigit,
                                  plateSerial: plate.plateSerial,
                                  plateProvince: plate.plateProvince,
                                }))
                              }
                            />
                            <AppInput
                              label="آدرس"
                              value={pilgrimExtraInfo.address}
                              onChangeText={(text) =>
                                updatePilgrimExtraField("address", text)
                              }
                              multiline
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View style={styles.pilgrimSearchBlock}>
                        <AppInput
                          key={`pilgrim-search-${pilgrimSearchFocusTick}`}
                          label="لطفا اطلاعات زائر را وارد نمایید"
                          value={pilgrimQuery}
                          onChangeText={setPilgrimQuery}
                          placeholder="نام، موبایل یا کد ملی"
                          autoFocus={pilgrimSearchFocusTick > 0}
                        />
                        <View style={styles.pilgrimList}>
                          {!pilgrimQuery.trim() ? (
                            <Text style={styles.noResult}></Text>
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
                                  setSelectedPilgrimMobile(
                                    pilgrim.mobileNumber,
                                  );
                                  setPilgrimQuery(pilgrim.fullName);
                                  applyPilgrimGenderDefault(pilgrim.gender);
                                }}
                              />
                            ))
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.formStepContent}>
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
                  <PersianDateField
                    label="تاریخ شروع اقامت"
                    value={startDate}
                    onChange={updateStartDate}
                    placeholder="انتخاب تاریخ شروع"
                  />
                  <PersianDateField
                    label="تاریخ پایان اقامت"
                    value={endDate}
                    onChange={updateEndDate}
                    placeholder="انتخاب تاریخ پایان"
                  />
                  <GuestCounter
                    label="آقا"
                    icon="male-outline"
                    value={maleCount}
                    selected={maleCount > 0 && femaleCount === 0}
                    onSelect={() => {
                      setMaleCount(1);
                      setFemaleCount(0);
                    }}
                    onChange={setMaleCount}
                  />
                  <GuestCounter
                    label="زن"
                    icon="female-outline"
                    value={femaleCount}
                    selected={femaleCount > 0 && maleCount === 0}
                    onSelect={() => {
                      setFemaleCount(1);
                      setMaleCount(0);
                    }}
                    onChange={setFemaleCount}
                  />
                  <AppInput
                    label="توضیحات رزرو"
                    value={reservationDescription}
                    onChangeText={setReservationDescription}
                    placeholder="توضیحات اختیاری درباره این رزرو"
                    multiline
                  />
                  {!editingReservationId ? (
                    <AppInput
                      label="کد رزرو"
                      value={trackingCode}
                      onChangeText={setTrackingCode}
                      placeholder="در صورت خالی بودن خودکار تولید می‌شود"
                    />
                  ) : null}
                </View>
              )}
              </ScrollView>
            </View>
          </View>
          <StickyBottomAction avoidKeyboard={false}>
            <View style={styles.wizardActions}>
              {formStep === 1 ? (
                <PrimaryButton
                  label="ادامه"
                  icon="arrow-back"
                  compact
                  style={styles.wizardPrimaryAction}
                  onPress={goToStep2}
                />
              ) : (
                <PrimaryButton
                  label={editingReservationId ? "ذخیره تغییرات" : "ثبت رزرو"}
                  icon={editingReservationId ? "save-outline" : "checkmark"}
                  loading={createMutation.isPending}
                  compact
                  style={styles.wizardPrimaryAction}
                  onPress={() => createMutation.mutate()}
                />
              )}
            </View>
          </StickyBottomAction>
        </KeyboardAvoidingView>
      ) : (
        <>
          <View style={styles.listToolbar}>
            <SearchToolbar>
              <SearchToolbarField>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="کد رزرو، نام زائر یا موبایل"
                  autoFocus
                  embedded
                  onSearchPress={submitSearch}
                />
              </SearchToolbarField>
              <ToolbarIconButton
                icon="add"
                onPress={openNewReservation}
                accessibilityLabel="رزرو جدید"
              />
            </SearchToolbar>
          </View>
          <ScreenScroll
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            onScroll={handleListScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                progressBackgroundColor={colors.surface}
              />
            }
          >
            {isReservationsLoading && reservations.length === 0 ? (
              <Text style={styles.loading}>در حال بارگذاری...</Text>
            ) : reservations.length === 0 && !isReservationsFetching ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="calendar-outline"
                  title={
                    hasFilters || searchQuery
                      ? "رزروی با این مشخصات یافت نشد"
                      : "رزروی جهت نمایش وجود ندارد"
                  }
                />
                {!hasFilters && !searchQuery ? (
                  <PrimaryButton
                    label="رزرو جدید"
                    icon="calendar-outline"
                    compact
                    onPress={openNewReservation}
                  />
                ) : null}
              </View>
            ) : (
              reservations.map((reservation) => (
                <View key={reservation.id} style={styles.reservationItem}>
                  <ListCard
                    title={reservation.pilgrimName ?? "زائر"}
                    titleIcon="person-outline"
                    badgeCaption={formatPersianDateTime(reservation.createdAt)}
                    guestCounts={{
                      male: reservation.maleGuestCount,
                      female: reservation.femaleGuestCount,
                    }}
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
                        icon: "call-outline",
                        label: "موبایل",
                        value: reservation.pilgrimMobile,
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
                        value: formatPersianDate(
                          reservation.reservationEndDate,
                        ),
                      },
                    ]}
                    footer={
                      <View style={styles.itemActionsBar}>
                        <Pressable
                          onPress={() => showReservationActions(reservation)}
                          style={({ pressed }) => [
                            styles.moreButton,
                            pressed && styles.moreButtonPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="سایر عملیات"
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={20}
                            color={colors.textMuted}
                          />
                        </Pressable>
                        <View style={styles.itemActionsPrimary}>
                          {reservation.status === "Confirmed" ||
                          reservation.status === "Completed" ? (
                            <PrimaryButton
                              label="ورود و خروج"
                              icon="log-in-outline"
                              variant="secondary"
                              compact
                              style={styles.itemActionPrimary}
                              labelStyle={styles.itemActionLabel}
                              onPress={() => openAttendance(reservation)}
                            />
                          ) : null}
                          <PrimaryButton
                            label="ویرایش"
                            icon="create-outline"
                            variant="secondary"
                            compact
                            style={styles.itemActionPrimary}
                            labelStyle={styles.itemActionLabel}
                            onPress={() => openReservation(reservation)}
                          />
                        </View>
                      </View>
                    }
                  />
                </View>
              ))
            )}
            {isFetchingNextPage ? (
              <View style={styles.listFooterLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.listFooterLoadingText}>
                  در حال بارگذاری...
                </Text>
              </View>
            ) : null}
          </ScreenScroll>
        </>
      )}
      <ReservationFiltersModal
        visible={filterModalVisible}
        value={draftFilters}
        onChange={setDraftFilters}
        onClose={() => setFilterModalVisible(false)}
        onApply={applyFilters}
      />
      <PilgrimCardModal
        visible={cardModalVisible}
        details={cardDetails}
        loading={cardLoading}
        onClose={() => {
          setCardModalVisible(false);
          setCardDetails(null);
        }}
      />

      {finalCheckoutReservation ? (
        <PendingDeliveredItemsCheckoutModal
          visible
          reservation={finalCheckoutReservation}
          onClose={() => setFinalCheckoutReservation(null)}
          onProceedCheckout={() => {
            const reservation = finalCheckoutReservation;
            setFinalCheckoutReservation(null);
            confirmFinalCheckout(reservation);
          }}
        />
      ) : null}

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
                تاریخ پایان رزرو «
                {extendingReservation.pilgrimName ?? "زائر"} •{" "}
                {extendingReservation.trackingCode}» تغییر می‌کند و ظرفیت
                موکب به‌روزرسانی می‌شود
              </Text>
            ) : null}

            <View style={styles.extendReadOnlyField}>
              <Text style={styles.extendReadOnlyLabel}>تاریخ شروع</Text>
              <Text style={styles.extendReadOnlyValue}>{extendStartDate}</Text>
            </View>

            <View style={styles.extendReadOnlyField}>
              <Text style={styles.extendReadOnlyLabel}>تاریخ پایان فعلی</Text>
              <Text style={styles.extendReadOnlyValue}>
                {extendCurrentEndDate}
              </Text>
            </View>

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

            <PersianDateField
              label="تاریخ پایان جدید"
              value={extendEndDate}
              onChange={(value) => {
                setExtendEndDate(value);
                setExtendDurationDays(
                  getExtensionDaysFromCurrentEnd(extendCurrentEndDate, value),
                );
              }}
              placeholder="انتخاب تاریخ پایان"
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
  listToolbar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  reservationItem: {
    marginBottom: 0,
  },
  emptyWrap: {
    gap: spacing.md,
    alignItems: "stretch",
  },
  itemActionsBar: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemActionsPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    flex: 1,
    flexShrink: 1,
  },
  moreButton: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  moreButtonPressed: {
    opacity: 0.85,
    backgroundColor: colors.borderLight,
  },
  itemActionPrimary: {
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
  extendReadOnlyField: {
    gap: spacing.xs,
  },
  extendReadOnlyLabel: {
    ...formTypography.label,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  extendReadOnlyValue: {
    ...formTypography.body,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.borderLight,
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
  wizardActions: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  wizardPrimaryAction: {
    flex: 1,
  },
  wizardSecondaryAction: {
    flex: 1,
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  formWizard: {
    flex: 1,
    minHeight: 0,
  },
  formArea: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  form: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  formStepContent: {
    width: "100%",
    gap: spacing.sm,
  },
  pilgrimSearchBlock: {
    width: "100%",
    gap: spacing.sm,
  },
  formTitle: {
    ...formTypography.title,
    color: colors.text,
    fontWeight: "600",
    marginTop: spacing.sm,
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
  pilgrimSection: {
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
  collapsibleHeader: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  collapsibleHeaderPressed: {
    opacity: 0.85,
  },
  collapsibleTitle: {
    ...formTypography.body,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    flex: 1,
  },
  pilgrimExtraFields: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  fieldLabel: {
    ...formTypography.label,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  genderRow: {
    direction: "ltr",
    flexDirection: "row",
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  genderButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  genderText: {
    ...formTypography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  genderTextSelected: {
    color: colors.primaryDark,
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
  counterRowSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(232, 238, 246, 0.45)",
  },
  counterLabel: {
    ...formTypography.body,
    color: colors.text,
    fontWeight: "500",
    textAlign: "right",
    writingDirection: "rtl",
  },
  counterLabelSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  counterTitle: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minHeight: 44,
    justifyContent: "flex-start",
  },
  counterTitlePressed: {
    opacity: 0.75,
  },
  counterControls: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  counterButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
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
  listFooterLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  listFooterLoadingText: {
    color: colors.textMuted,
    fontSize: 13,
    writingDirection: "rtl",
  },
});
