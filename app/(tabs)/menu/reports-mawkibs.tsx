import { useCallback } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { CapacityStatGrid, DonutChart } from "@/src/components/charts";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { MawkibReportsDayCarousel } from "@/src/components/reports/MawkibReportsDayCarousel";
import { ScreenContainer, ScreenScroll } from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { todayDateStringInAppTz } from "@/src/lib/date-only";
import { formatPersianNumber } from "@/src/lib/persianDate";
import { colors, radius, spacing, typography } from "@/src/lib/theme";
import type { MawkibCapacityReport } from "@/src/services/reports";

function MetricChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const palette =
    tone === "success"
      ? { bg: colors.successLight, text: colors.success }
      : tone === "warning"
        ? { bg: colors.warningLight, text: colors.warning }
        : tone === "danger"
          ? { bg: colors.dangerLight, text: colors.danger }
          : tone === "info"
            ? { bg: "#e0f2fe", text: "#0369a1" }
            : { bg: colors.borderLight, text: colors.text };

  return (
    <View style={[styles.metricChip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.metricValue, { color: palette.text }]}>
        {formatPersianNumber(value)}
      </Text>
      <Text style={[styles.metricLabel, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function MawkibReportCard({
  report,
  isToday,
}: {
  report: MawkibCapacityReport;
  isToday: boolean;
}) {
  const dayLabel = isToday ? "امروز" : "این روز";
  const occupancy =
    report.totalCapacity > 0
      ? Math.round((report.totalFilled / report.totalCapacity) * 100)
      : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.occupancyBadge}>
          <Text style={styles.occupancyValue}>
            {formatPersianNumber(occupancy)}٪
          </Text>
          <Text style={styles.occupancyLabel}>اشغال {dayLabel}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{report.name}</Text>
          <Text style={styles.cardSubtitle}>
            ظرفیت کل {formatPersianNumber(report.totalCapacity)} نفر
          </Text>
        </View>
      </View>

      <CapacityStatGrid
        maleCapacity={report.maleCapacity}
        femaleCapacity={report.femaleCapacity}
        totalCapacity={report.totalCapacity}
        maleFilled={report.maleFilled}
        femaleFilled={report.femaleFilled}
        totalFilled={report.totalFilled}
        maleRemaining={report.maleRemaining}
        femaleRemaining={report.femaleRemaining}
        totalRemaining={report.totalRemaining}
      />

      <View style={styles.metricGrid}>
        <MetricChip label="ظرفیت آقا" value={report.maleCapacity} tone="info" />
        <MetricChip
          label="ظرفیت بانو"
          value={report.femaleCapacity}
          tone="danger"
        />
        <MetricChip label="ظرفیت کل" value={report.totalCapacity} />
        <MetricChip label="پر شده آقا" value={report.maleFilled} tone="info" />
        <MetricChip
          label="پر شده بانو"
          value={report.femaleFilled}
          tone="danger"
        />
        <MetricChip
          label="پر شده کل"
          value={report.totalFilled}
          tone="warning"
        />
        <MetricChip
          label="باقیمانده آقا"
          value={report.maleRemaining}
          tone="success"
        />
        <MetricChip
          label="باقیمانده بانو"
          value={report.femaleRemaining}
          tone="success"
        />
        <MetricChip
          label="باقیمانده کل"
          value={report.totalRemaining}
          tone="success"
        />
      </View>

      <Text style={styles.sectionLabel}>وضعیت حضور {dayLabel}</Text>
      <DonutChart
        data={[
          {
            key: "present",
            label: "حاضرین",
            value: report.presentCount,
            color: colors.success,
          },
          {
            key: "absent",
            label: "غائبین",
            value: report.absentCount,
            color: colors.warning,
          },
        ]}
        size={140}
        strokeWidth={18}
        centerLabel="نفر"
        centerValue={formatPersianNumber(
          report.presentCount + report.absentCount,
        )}
      />
    </View>
  );
}

export default function ReportsMawkibsScreen() {
  const { ownerId, canViewReports } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries({ queryKey: ["reports-mawkibs"] });
  });

  const renderReport = useCallback(
    (report: MawkibCapacityReport, date: string) => {
      const isToday = date === todayDateStringInAppTz();
      return <MawkibReportCard report={report} isToday={isToday} />;
    },
    [],
  );

  if (!canViewReports) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return (
    <ScreenContainer>
      <AppHeader
        title="گزارشات موکب"
        subtitle="آمار ظرفیت و حضور "
        onBack={() => router.back()}
      />

      <ScreenScroll
        contentContainerStyle={styles.content}
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
          <MawkibReportsDayCarousel
            ownerId={ownerId}
            renderReport={renderReport}
          />
        ) : null}
      </ScreenScroll>

      <NewReservationFab />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 120,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardTitleWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: 2,
  },
  occupancyBadge: {
    minWidth: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: "center",
  },
  occupancyValue: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
  },
  occupancyLabel: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 11,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricChip: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    ...typography.label,
    fontWeight: "700",
    fontSize: 15,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: "center",
  },
  sectionLabel: {
    ...typography.label,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
  },
});
