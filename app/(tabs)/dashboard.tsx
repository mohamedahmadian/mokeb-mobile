import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { CarPlateSearchModal } from "@/src/components/CarPlateSearchModal";
import { CapacityDayCarousel } from "@/src/components/capacity/CapacityDayCarousel";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { ScreenContainer } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { useTabRefresh } from "@/src/hooks/useTabRefresh";
import { notify } from "@/src/lib/notify";
import { colors, spacing } from "@/src/lib/theme";
import { fontFamilies } from "@/src/lib/fonts";
type ServiceIcon = keyof typeof Ionicons.glyphMap;

type ServiceItem = {
  key: string;
  label: string;
  icon: ServiceIcon;
  tint: string;
  iconColor: string;
  onPress: () => void;
};

type ServiceSection = {
  title: string;
  items: ServiceItem[];
};

function ServiceTile({ item }: { item: ServiceItem }) {
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.serviceTile,
        pressed && styles.serviceTilePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.serviceIconWrap, { backgroundColor: item.tint }]}>
        <Ionicons
          name={item.icon}
          size={24}
          color={item.iconColor}
          style={item.icon === "log-in" ? styles.rtlDirectionalIcon : undefined}
        />
      </View>
      <Text style={styles.serviceLabel} numberOfLines={2}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function ServiceSectionBlock({ section }: { section: ServiceSection }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.serviceGrid}>
        {section.items.map((item) => (
          <ServiceTile key={item.key} item={item} />
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, ownerId, canManage, canViewReports, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [carPlateSearchVisible, setCarPlateSearchVisible] = useState(false);

  const refreshDashboardData = () => {
    void queryClient.invalidateQueries({ queryKey: ["mawkib-capacity-day"] });
    void queryClient.invalidateQueries({ queryKey: ["mawkib-inventory"] });
  };

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries({ queryKey: ["mawkib-capacity-day"] });
    await queryClient.invalidateQueries({ queryKey: ["mawkib-inventory"] });
  });

  useTabRefresh({ onRefresh: refreshDashboardData });

  const openTab = (href: Href) => router.push(href);

  const openCapacityCalendar = (mawkibId?: number) => {
    router.push({
      pathname: "/menu/capacity-calendar",
      params: mawkibId ? { mawkibId: String(mawkibId) } : undefined,
    });
  };

  const requestId = () => String(Date.now());

  const openAttendanceView = (view: "search" | "present" | "absent") => {
    router.push({
      pathname: "/(tabs)/attendance",
      params: {
        attendanceView: view,
        attendanceRequestId: requestId(),
      },
    });
  };

  const openMealsSearch = () => {
    router.push({
      pathname: "/(tabs)/meals",
      params: {
        mealsView: "search",
        mealsRequestId: requestId(),
      },
    });
  };

  const openPilgrims = (action: "search" | "new") => {
    router.push({
      pathname: "/(tabs)/pilgrims",
      params: {
        pilgrimAction: action,
        pilgrimRequestId: requestId(),
      },
    });
  };

  const openMawkibs = (action?: "new") => {
    router.push({
      pathname: "/menu/mawkibs",
      params: action
        ? {
            mawkibAction: action,
            mawkibRequestId: requestId(),
          }
        : undefined,
    });
  };

  const openNewReservation = () => {
    router.push({
      pathname: "/(tabs)/reservations",
      params: {
        reservationAction: "new",
        reservationRequestId: requestId(),
      },
    });
  };

  const openProfileEdit = () => {
    router.push({
      pathname: "/(tabs)/profile",
      params: {
        profileView: "edit",
        profileRequestId: requestId(),
      },
    });
  };

  const confirmLogout = () => {
    notify("خروج از سامانه", "آیا از خروج از حساب کاربری مطمئن هستید؟", [
      { text: "انصراف", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const sections: ServiceSection[] = [
    {
      title: "زائر",
      items: [
        {
          key: "pilgrims-new",
          label: "زائر جدید",
          icon: "person-add",
          tint: "#e0f2fe",
          iconColor: "#0284c7",
          onPress: () => openPilgrims("new"),
        },
        {
          key: "pilgrims-search",
          label: "جستجوی زائر",
          icon: "search",
          tint: "#ecfdf5",
          iconColor: "#059669",
          onPress: () => openPilgrims("search"),
        },
        {
          key: "pilgrims-car-search",
          label: "جستجوی ماشین",
          icon: "car",
          tint: "#fef3c7",
          iconColor: "#d97706",
          onPress: () => setCarPlateSearchVisible(true),
        },
      ],
    },
    {
      title: "موکب",
      items: [
        {
          key: "mawkibs-add",
          label: "ثبت موکب",
          icon: "add-circle",
          tint: "#f0fdf4",
          iconColor: "#16a34a",
          onPress: () => openMawkibs("new"),
        },
        {
          key: "mawkibs-list",
          label: "مدیریت موکب",
          icon: "home",
          tint: colors.primaryLight,
          iconColor: colors.primaryDark,
          onPress: () => openMawkibs(),
        },
        {
          key: "mawkibs-capacity",
          label: "تقویم ظرفیت",
          icon: "calendar",
          tint: "#e0f2fe",
          iconColor: "#0284c7",
          onPress: () => openCapacityCalendar(),
        },
      ],
    },
    {
      title: "رزرو",
      items: [
        {
          key: "reservations-new",
          label: "رزرو جدید",
          icon: "calendar-outline",
          tint: "#fef3c7",
          iconColor: "#d97706",
          onPress: openNewReservation,
        },
        {
          key: "reservations-list",
          label: "لیست رزروها",
          icon: "calendar",
          tint: "#e8eef6",
          iconColor: colors.primary,
          onPress: () => openTab("/(tabs)/reservations"),
        },
      ],
    },
    {
      title: "ورود و خروج",
      items: [
        {
          key: "attendance-search",
          label: "جستجوی زائر",
          icon: "log-in",
          tint: "#e0f2fe",
          iconColor: "#0369a1",
          onPress: () => openAttendanceView("search"),
        },
        {
          key: "attendance-present",
          label: "حاضرین",
          icon: "checkmark-circle",
          tint: "#d1fae5",
          iconColor: colors.success,
          onPress: () => openAttendanceView("present"),
        },
        {
          key: "attendance-absent",
          label: "غائبین",
          icon: "person-remove",
          tint: "#fee2e2",
          iconColor: colors.danger,
          onPress: () => openAttendanceView("absent"),
        },
      ],
    },
    {
      title: "وعده غذایی",
      items: [
        {
          key: "meals-search",
          label: "جستجوی زائر",
          icon: "restaurant",
          tint: "#ffedd5",
          iconColor: "#c2410c",
          onPress: openMealsSearch,
        },
        {
          key: "meals-menu",
          label: "وعده‌ها",
          icon: "fast-food",
          tint: "#fef9c3",
          iconColor: "#ca8a04",
          onPress: () => openTab("/(tabs)/meals"),
        },
        ...(canViewReports
          ? [
              {
                key: "meals-report",
                label: "گزارش",
                icon: "document-text" as const,
                tint: "#e2e8f0",
                iconColor: "#475569",
                onPress: () => openTab("/menu/meal-report"),
              },
            ]
          : []),
      ],
    },
    ...(canViewReports
      ? [
          {
            title: "گزارشات",
            items: [
              {
                key: "reports-pilgrims",
                label: "گزارشات زائرین",
                icon: "stats-chart" as const,
                tint: "#ecfdf5",
                iconColor: "#059669",
                onPress: () => openTab("/menu/reports-pilgrims"),
              },
              {
                key: "reports-mawkibs",
                label: "گزارشات موکب",
                icon: "pie-chart" as const,
                tint: colors.accentLight,
                iconColor: colors.accent,
                onPress: () => openTab("/menu/reports-mawkibs"),
              },
            ],
          } satisfies ServiceSection,
        ]
      : []),
    {
      title: "پروفایل",
      items: [
        {
          key: "profile-edit",
          label: "ویرایش اطلاعات",
          icon: "person-circle",
          tint: "#e8eef6",
          iconColor: colors.primaryDark,
          onPress: openProfileEdit,
        },
        {
          key: "profile-password",
          label: "تغییر رمز عبور",
          icon: "key",
          tint: "#fff7ed",
          iconColor: "#ea580c",
          onPress: () => openTab("/menu/change-password"),
        },
        {
          key: "profile-logout",
          label: "خروج از حساب",
          icon: "log-out",
          tint: colors.dangerLight,
          iconColor: colors.danger,
          onPress: confirmLogout,
        },
      ],
    },
    ...(canManage
      ? [
          {
            title: "مدیریت",
            items: [
              {
                key: "manage-servants",
                label: "خادمین",
                icon: "people-circle" as const,
                tint: "#ecfeff",
                iconColor: "#0e7490",
                onPress: () => openTab("/menu/servants"),
              },
              {
                key: "manage-pilgrims",
                label: "زائرین",
                icon: "people" as const,
                tint: "#e0f2fe",
                iconColor: "#0284c7",
                onPress: () =>
                  router.push({
                    pathname: "/menu/manage-data",
                    params: { section: "pilgrims" },
                  }),
              },
              {
                key: "manage-reservations",
                label: "رزروها",
                icon: "calendar" as const,
                tint: "#e8eef6",
                iconColor: colors.primary,
                onPress: () =>
                  router.push({
                    pathname: "/menu/manage-data",
                    params: { section: "reservations" },
                  }),
              },
              {
                key: "manage-attendance",
                label: "ورود و خروج",
                icon: "log-in" as const,
                tint: "#d1fae5",
                iconColor: colors.success,
                onPress: () =>
                  router.push({
                    pathname: "/menu/manage-data",
                    params: { section: "attendance" },
                  }),
              },
              {
                key: "manage-meals",
                label: "وعده غذایی",
                icon: "restaurant" as const,
                tint: "#ffedd5",
                iconColor: "#c2410c",
                onPress: () =>
                  router.push({
                    pathname: "/menu/manage-data",
                    params: { section: "meals" },
                  }),
              },
            ],
          } satisfies ServiceSection,
        ]
      : []),
  ];

  return (
    <ScreenContainer>
      <AppHeader
        title="داشبورد"
        subtitle={`${user?.fullName ?? ""}${
          user?.roles.includes("MawkibServant") &&
          !user?.roles.includes("MawkibOwner")
            ? " (خادم)"
            : ""
        }`}
        showProfile
        showLogo
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
        {ownerId ? (
          <CapacityDayCarousel
            ownerId={ownerId}
            canOpenDetails={canViewReports}
            onOpenDetails={() => openTab("/menu/reports-mawkibs")}
            onOpenCalendar={openCapacityCalendar}
          />
        ) : null}

        {sections.map((section) => (
          <ServiceSectionBlock key={section.title} section={section} />
        ))}
      </ScrollView>
      <NewReservationFab />
      {ownerId ? (
        <CarPlateSearchModal
          visible={carPlateSearchVisible}
          ownerId={ownerId}
          onClose={() => setCarPlateSearchVisible(false)}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 12,
    gap: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  serviceGrid: {
    direction: "rtl",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.md,
  },
  serviceTile: {
    width: "25%",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  serviceTilePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  serviceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rtlDirectionalIcon: {
    transform: [{ scaleX: -1 }],
  },
  serviceLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.text,
    textAlign: "center",
    writingDirection: "rtl",
    minHeight: 30,
  },
});
