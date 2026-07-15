import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { DonutChart, HorizontalBarChart } from "@/src/components/charts";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { EmptyState, ScreenContainer } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { getPilgrimReports } from "@/src/services/reports";

const CHART_COLORS = [
  colors.primary,
  "#0284c7",
  colors.accent,
  colors.success,
  "#c2410c",
  "#0f766e",
  colors.warning,
  "#475569",
];

function StatBox({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: tint }]}>
      <Text style={styles.statValue}>{value.toLocaleString("fa-IR")}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ReportsPilgrimsScreen() {
  const { ownerId, canViewReports } = useAuth();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["reports-pilgrims", ownerId],
    enabled: !!ownerId && canViewReports,
    queryFn: () => getPilgrimReports(ownerId!),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await refetch();
  });

  if (!canViewReports) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const genderSlices =
    data?.byGender.map((item, index) => ({
      key: item.key,
      label: item.label,
      value: item.count,
      color:
        item.key === "Male"
          ? "#0284c7"
          : item.key === "Female"
            ? "#be185d"
            : CHART_COLORS[index % CHART_COLORS.length],
    })) ?? [];

  const countrySlices =
    data?.byCountry.map((item, index) => ({
      key: item.key,
      label: item.label,
      value: item.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    })) ?? [];

  return (
    <ScreenContainer>
      <AppHeader
        title="گزارشات زائرین"
        subtitle="آمار بر اساس استان، شهر، جنسیت و کشور"
        onBack={() => router.back()}
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
        {isLoading ? (
          <Text style={styles.loading}>در حال بارگذاری...</Text>
        ) : isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title="خطا در بارگذاری"
            description={
              error instanceof Error ? error.message : "گزارش در دسترس نیست"
            }
          />
        ) : !data || data.total === 0 ? (
          <EmptyState
            icon="people-outline"
            title="زائری ثبت نشده"
            description="با ثبت رزرو برای زائران، گزارش‌ها اینجا نمایش داده می‌شوند."
          />
        ) : (
          <>
            <View style={styles.statGrid}>
              <StatBox
                label="کل زائرین"
                value={data.total}
                tint={colors.primaryLight}
              />
              <StatBox label="مرد" value={data.maleCount} tint="#e0f2fe" />
              <StatBox label="زن" value={data.femaleCount} tint="#fce7f3" />
              <StatBox
                label="استان‌ها"
                value={data.provinceCount}
                tint={colors.accentLight}
              />
              <StatBox label="شهرها" value={data.cityCount} tint="#ecfdf5" />
              <StatBox
                label="کشورها"
                value={data.countryCount}
                tint="#ffedd5"
              />
            </View>

            <SectionCard title="توزیع جنسیت">
              <DonutChart
                data={genderSlices}
                centerLabel="زائر"
                centerValue={data.total.toLocaleString("fa-IR")}
              />
            </SectionCard>

            <SectionCard title="توزیع کشور">
              {countrySlices.length === 0 ? (
                <Text style={styles.emptyChart}>کشور ثبت نشده</Text>
              ) : (
                <DonutChart
                  data={countrySlices}
                  centerLabel="کشور"
                  centerValue={data.countryCount.toLocaleString("fa-IR")}
                />
              )}
            </SectionCard>

            <SectionCard title="بر اساس استان">
              <HorizontalBarChart
                data={data.byProvince.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: item.count,
                }))}
                accent={colors.primary}
              />
            </SectionCard>

            <SectionCard title="بر اساس شهر">
              <HorizontalBarChart
                data={data.byCity.map((item) => ({
                  key: item.key,
                  label: item.label,
                  value: item.count,
                }))}
                accent="#0f766e"
              />
            </SectionCard>
          </>
        )}
      </ScrollView>

      <NewReservationFab />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  loading: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statBox: {
    width: "31.5%",
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: "700",
    fontSize: 18,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
  emptyChart: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
