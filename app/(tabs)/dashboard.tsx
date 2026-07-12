import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { ScreenContainer } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { notify } from "@/src/lib/notify";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { fontFamilies } from "@/src/lib/fonts";
import { getDashboardStats } from "@/src/services/mawkibs";

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

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statDot, { backgroundColor: accent }]} />
      <Text style={styles.statValue}>{value.toLocaleString("fa-IR")}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

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
          style={
            item.icon === "log-in" ? styles.rtlDirectionalIcon : undefined
          }
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
  const { user } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: () => getDashboardStats(user!.id),
  });

  const openTab = (href: Href) => router.push(href);

  const openAttendanceView = (view: "search" | "present" | "absent") => {
    router.push({
      pathname: "/(tabs)/attendance",
      params: {
        attendanceView: view,
        attendanceRequestId: String(Date.now()),
      },
    });
  };

  const openMealsSearch = () => {
    router.push({
      pathname: "/(tabs)/meals",
      params: {
        mealsView: "search",
        mealsRequestId: String(Date.now()),
      },
    });
  };

  const sections: ServiceSection[] = [
    {
      title: "زائر",
      items: [
        {
          key: "pilgrims-list",
          label: "لیست زائرین",
          icon: "people",
          tint: "#e0f2fe",
          iconColor: "#0284c7",
          onPress: () => openTab("/(tabs)/pilgrims"),
        },
        {
          key: "pilgrims-search",
          label: "جستجوی زائر",
          icon: "search",
          tint: "#ecfdf5",
          iconColor: "#059669",
          onPress: () => openTab("/(tabs)/pilgrims"),
        },
        {
          key: "pilgrims-card",
          label: "زائر کارت",
          icon: "card",
          tint: "#fff7ed",
          iconColor: "#ea580c",
          onPress: () => openTab("/(tabs)/reservations"),
        },
      ],
    },
    {
      title: "موکب",
      items: [
        {
          key: "mawkibs-list",
          label: "مدیریت موکب",
          icon: "home",
          tint: colors.primaryLight,
          iconColor: colors.primaryDark,
          onPress: () => openTab("/menu/mawkibs"),
        },
        {
          key: "mawkibs-add",
          label: "ثبت موکب",
          icon: "add-circle",
          tint: "#f0fdf4",
          iconColor: "#16a34a",
          onPress: () => openTab("/menu/mawkibs"),
        },
      ],
    },
    {
      title: "رزرو",
      items: [
        {
          key: "reservations-list",
          label: "لیست رزروها",
          icon: "calendar",
          tint: "#e8eef6",
          iconColor: colors.primary,
          onPress: () => openTab("/(tabs)/reservations"),
        },
        {
          key: "reservations-new",
          label: "رزرو جدید",
          icon: "calendar-outline",
          tint: "#fef3c7",
          iconColor: "#d97706",
          onPress: () => openTab("/(tabs)/reservations"),
        },
        {
          key: "delivered-items",
          label: "امانت‌ها",
          icon: "briefcase",
          tint: "#fce7f3",
          iconColor: "#db2777",
          onPress: () => openTab("/(tabs)/reservations"),
        },
        {
          key: "extend",
          label: "تمدید رزرو",
          icon: "time",
          tint: "#ecfeff",
          iconColor: "#0891b2",
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
        {
          key: "meals-report",
          label: "گزارش",
          icon: "document-text",
          tint: "#e2e8f0",
          iconColor: "#475569",
          onPress: () =>
            notify("توجه", "گزارش وعده غذایی هنوز پیاده‌سازی نشده است"),
        },
      ],
    },
  ];

  return (
    <ScreenContainer>
      <AppHeader
        title="داشبورد"
        subtitle={`خوش آمدید ${user?.fullName ?? ""}`}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsSection}>
          {isLoading ? (
            <Text style={styles.loading}>در حال بارگذاری...</Text>
          ) : (
            <View style={styles.statsGrid}>
              <StatChip
                label="موکب"
                value={stats?.mawkibCount ?? 0}
                accent={colors.accent}
              />
              <StatChip
                label="زائر"
                value={stats?.pilgrimCount ?? 0}
                accent="#0284c7"
              />
              <StatChip
                label="رزرو"
                value={stats?.totalReservations ?? 0}
                accent={colors.primary}
              />
              <StatChip
                label="حاضر"
                value={stats?.presentGuests ?? 0}
                accent={colors.success}
              />
            </View>
          )}
        </View>

        {sections.map((section) => (
          <ServiceSectionBlock key={section.title} section={section} />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl + 12,
    gap: spacing.lg,
  },
  loading: {
    ...typography.caption,
    textAlign: "center",
    color: colors.textMuted,
    width: "100%",
    paddingVertical: spacing.sm,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    direction: "rtl",
    flexDirection: "row",
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    alignItems: "center",
    gap: 2,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: "center",
    writingDirection: "rtl",
  },
  statLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
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
