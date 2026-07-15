import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/src/lib/fonts";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/src/components/AppHeader";
import {
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SearchBar,
} from "@/src/components/ui";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { notify } from "@/src/lib/notify";
import { formatMobileForLookup } from "@/src/lib/validation";
import { fontFamilies } from "@/src/lib/fonts";
import { colors, radius, spacing } from "@/src/lib/theme";
import { pickDataSyncFile, shareDataSyncExport } from "@/src/lib/data-sync-io";
import {
  clearSectionData,
  clearSectionDataForPilgrim,
  getManagementStats,
  getPilgrimSectionStats,
  type ManageSection,
} from "@/src/services/data-management";
import {
  buildExportFilename,
  exportSectionData,
  importSectionData,
  previewImport,
  type ImportPreview,
} from "@/src/services/data-sync";
import { listPilgrims } from "@/src/services/pilgrims";
import type { User } from "@/src/types";

type ClearMode = "all" | "pilgrim";

const SECTION_META: Record<
  ManageSection,
  {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    soft: string;
    allConfirmTitle: string;
    allWarning: string;
    pilgrimConfirmTitle: string;
    pilgrimWarning: (name: string) => string;
    pilgrimClearLabel: string;
  }
> = {
  pilgrims: {
    title: "مدیریت زائرین",
    icon: "people",
    accent: "#0284c7",
    soft: "#e0f2fe",
    allConfirmTitle: "حذف اطلاعات زائرین",
    allWarning:
      "با حذف اطلاعات زائرین، کلیه اطلاعات موجود در بخش‌های مختلف حذف خواهد شد. آیا تمایل به انجام این کار دارید؟",
    pilgrimConfirmTitle: "حذف اطلاعات این زائر",
    pilgrimWarning: (name) =>
      `با حذف «${name}»، رزروها، ورود و خروج و وعده‌های مرتبط نیز پاک می‌شود. ادامه می‌دهید؟`,
    pilgrimClearLabel: "پاک کردن اطلاعات این زائر",
  },
  reservations: {
    title: "مدیریت رزروها",
    icon: "calendar",
    accent: colors.primary,
    soft: colors.primaryLight,
    allConfirmTitle: "حذف اطلاعات رزروها",
    allWarning: "آیا تمایل دارید همه اطلاعات مربوط به این بخش پاک شود؟",
    pilgrimConfirmTitle: "حذف رزروهای این زائر",
    pilgrimWarning: (name) =>
      `همه رزروهای «${name}» (به‌همراه وعده و ورود/خروج مرتبط) پاک می‌شود. ادامه می‌دهید؟`,
    pilgrimClearLabel: "پاک کردن رزروهای این زائر",
  },
  attendance: {
    title: "مدیریت ورود و خروج",
    icon: "log-in",
    accent: "#0369a1",
    soft: "#e0f2fe",
    allConfirmTitle: "حذف اطلاعات ورود و خروج",
    allWarning: "آیا تمایل دارید همه اطلاعات مربوط به این بخش پاک شود؟",
    pilgrimConfirmTitle: "حذف ورود و خروج این زائر",
    pilgrimWarning: (name) =>
      `رویدادهای ورود و خروج «${name}» پاک و وضعیت حضورش بازنشانی می‌شود. ادامه می‌دهید؟`,
    pilgrimClearLabel: "پاک کردن ورود و خروج این زائر",
  },
  meals: {
    title: "مدیریت وعده غذایی",
    icon: "restaurant",
    accent: "#c2410c",
    soft: "#ffedd5",
    allConfirmTitle: "حذف اطلاعات وعده غذایی",
    allWarning: "آیا تمایل دارید همه اطلاعات مربوط به این بخش پاک شود؟",
    pilgrimConfirmTitle: "حذف وعده‌های این زائر",
    pilgrimWarning: (name) =>
      `برنامه و وعده‌های غذایی «${name}» پاک می‌شود. ادامه می‌دهید؟`,
    pilgrimClearLabel: "پاک کردن وعده‌های این زائر",
  },
};

function isManageSection(value: string | undefined): value is ManageSection {
  return (
    value === "pilgrims" ||
    value === "reservations" ||
    value === "attendance" ||
    value === "meals"
  );
}

function ModeSwitch({
  mode,
  onChange,
  accent,
}: {
  mode: ClearMode;
  onChange: (mode: ClearMode) => void;
  accent: string;
}) {
  return (
    <View style={styles.modeSwitch}>
      {(
        [
          { key: "all", label: "کل بخش", icon: "layers-outline" },
          { key: "pilgrim", label: "یک زائر", icon: "person-outline" },
        ] as const
      ).map((item) => {
        const active = mode === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.modeChip,
              active && { backgroundColor: accent, borderColor: accent },
              pressed && styles.modeChipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={active ? "#fff" : colors.textMuted}
            />
            <Text
              style={[
                styles.modeChipLabel,
                active && styles.modeChipLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatCard({
  label,
  count,
  icon,
  accent,
  soft,
  compact = false,
}: {
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  soft: string;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        compact && styles.statCardCompact,
        { backgroundColor: soft },
      ]}
    >
      <View style={[styles.statIcon, compact && styles.statIconCompact]}>
        <Ionicons name={icon} size={compact ? 16 : 20} color={accent} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text
          style={[
            styles.statCount,
            compact && styles.statCountCompact,
            { color: accent },
          ]}
        >
          {count.toLocaleString("fa-IR")}
        </Text>
      </View>
    </View>
  );
}

function formatImportPreviewMessage(preview: ImportPreview): string {
  const lines = [
    `کل رکوردها: ${preview.total.toLocaleString("fa-IR")}`,
    `جدید: ${preview.creates.toLocaleString("fa-IR")}`,
    `به‌روزرسانی: ${preview.updates.toLocaleString("fa-IR")}`,
    `رد شده: ${preview.skipped.toLocaleString("fa-IR")}`,
  ];

  if (preview.skipReasons.length) {
    lines.push("");
    lines.push("دلایل رد:");
    for (const item of preview.skipReasons) {
      lines.push(`• ${item.reason}: ${item.count.toLocaleString("fa-IR")}`);
    }
  }

  if (preview.warnings.length) {
    lines.push("");
    for (const warning of preview.warnings) {
      lines.push(warning);
    }
  }

  lines.push("");
  lines.push(
    "رکوردهای تکراری با کلید یکتا (موبایل، کد رزرو، وعده) به‌روزرسانی می‌شوند.",
  );

  return lines.join("\n");
}

function invalidateManagementQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["management-stats"] }),
    queryClient.invalidateQueries({ queryKey: ["pilgrim-section-stats"] }),
    queryClient.invalidateQueries({ queryKey: ["pilgrims"] }),
    queryClient.invalidateQueries({ queryKey: ["pilgrims-count"] }),
    queryClient.invalidateQueries({ queryKey: ["reservations"] }),
    queryClient.invalidateQueries({ queryKey: ["reservations-count"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
    queryClient.invalidateQueries({ queryKey: ["meals-lookup"] }),
    queryClient.invalidateQueries({ queryKey: ["attendance-lookup"] }),
    queryClient.invalidateQueries({ queryKey: ["meal-plans"] }),
  ]);
}

export default function ManageDataScreen() {
  const { user, ownerId, canManage } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { section: sectionParam } = useLocalSearchParams<{
    section?: string;
  }>();

  const section = isManageSection(sectionParam) ? sectionParam : null;
  const meta = section ? SECTION_META[section] : null;

  const [mode, setMode] = useState<ClearMode>("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [selectedPilgrim, setSelectedPilgrim] = useState<User | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const statsQuery = useQuery({
    queryKey: ["management-stats", ownerId],
    enabled: !!ownerId && !!section && canManage,
    queryFn: () => getManagementStats(ownerId!),
  });

  const searchQuery = useQuery({
    queryKey: ["manage-pilgrim-search", ownerId, debouncedQuery],
    enabled:
      !!ownerId &&
      canManage &&
      mode === "pilgrim" &&
      debouncedQuery.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: () => listPilgrims(ownerId!, { query: debouncedQuery }),
  });

  const pilgrimStatsQuery = useQuery({
    queryKey: ["pilgrim-section-stats", ownerId, selectedPilgrim?.id],
    enabled: !!ownerId && canManage && !!selectedPilgrim && mode === "pilgrim",
    queryFn: () => getPilgrimSectionStats(ownerId!, selectedPilgrim!.id),
  });

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([
      statsQuery.refetch(),
      searchQuery.refetch(),
      pilgrimStatsQuery.refetch(),
    ]);
  });

  const stats = statsQuery.data;
  const searchResults = searchQuery.data ?? [];
  const pilgrimStats = pilgrimStatsQuery.data;

  const primaryStat = useMemo(() => {
    if (!section || !stats) return null;
    switch (section) {
      case "pilgrims":
        return { label: "تعداد کل زائرین", count: stats.pilgrims };
      case "reservations":
        return { label: "تعداد کل رزروها", count: stats.reservations };
      case "attendance":
        return {
          label: "تعداد کل رویدادهای ورود و خروج",
          count: stats.attendanceEvents,
        };
      case "meals":
        return { label: "تعداد کل وعده‌های غذایی", count: stats.mealPlans };
    }
  }, [section, stats]);

  const pilgrimPrimary = useMemo(() => {
    if (!pilgrimStats || !section) return null;
    switch (section) {
      case "pilgrims":
        return {
          label: "این زائر در سیستم",
          count: 1,
          emptyHint: null as string | null,
        };
      case "reservations":
        return {
          label: "رزروهای این زائر",
          count: pilgrimStats.reservations,
          emptyHint: "این زائر رزروی در این موکب ندارد.",
        };
      case "attendance":
        return {
          label: "رویدادهای ورود و خروج",
          count: pilgrimStats.attendanceEvents,
          emptyHint: "رویداد ورود و خروجی برای این زائر ثبت نشده است.",
        };
      case "meals":
        return {
          label: "وعده‌های غذایی",
          count: pilgrimStats.mealPlans,
          emptyHint: "وعده غذایی برای این زائر ثبت نشده است.",
        };
    }
  }, [pilgrimStats, section]);

  const canClearPilgrim =
    section === "pilgrims" ||
    (pilgrimPrimary != null && pilgrimPrimary.count > 0);

  const clearAllMutation = useMutation({
    mutationFn: () => clearSectionData(ownerId!, section!),
    onSuccess: async () => {
      await invalidateManagementQueries(queryClient);
      notify("موفق", "اطلاعات این بخش با موفقیت پاک شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const clearPilgrimMutation = useMutation({
    mutationFn: () =>
      clearSectionDataForPilgrim(ownerId!, section!, selectedPilgrim!.id),
    onSuccess: async () => {
      await invalidateManagementQueries(queryClient);
      setSelectedPilgrim(null);
      setQuery("");
      notify("موفق", "اطلاعات این زائر با موفقیت پاک شد");
    },
    onError: (error: Error) => notify("خطا", error.message),
  });

  const handleModeChange = (next: ClearMode) => {
    setMode(next);
    setSelectedPilgrim(null);
    setQuery("");
  };

  const handleClearAll = () => {
    if (!section || !meta) return;
    notify(meta.allConfirmTitle, meta.allWarning, [
      { text: "انصراف", style: "cancel" },
      {
        text: "پاک کردن",
        style: "destructive",
        onPress: () => clearAllMutation.mutate(),
      },
    ]);
  };

  const syncScope = mode === "pilgrim" ? "pilgrim" : "all";

  const handleExport = async () => {
    if (!section || !ownerId) return;
    if (mode === "pilgrim" && !selectedPilgrim) {
      notify("خطا", "ابتدا یک زائر انتخاب کنید");
      return;
    }

    setExporting(true);
    try {
      const payload = await exportSectionData(ownerId, section, syncScope, {
        ownerMobile: user?.mobileNumber,
        pilgrimUserId: selectedPilgrim?.id ?? null,
        pilgrimMobile: selectedPilgrim?.mobileNumber,
      });

      if (!payload.items.length) {
        notify("خروجی", "داده‌ای برای صادر کردن وجود ندارد");
        return;
      }

      await shareDataSyncExport(
        payload,
        buildExportFilename(section, syncScope),
      );
      notify(
        "موفق",
        `${payload.items.length.toLocaleString("fa-IR")} رکورد صادر شد`,
      );
    } catch (error) {
      notify("خطا", error instanceof Error ? error.message : "خطا در خروجی");
    } finally {
      setExporting(false);
    }
  };

  const confirmImport = (
    payload: Awaited<ReturnType<typeof pickDataSyncFile>>["payload"],
  ) => {
    if (!section || !ownerId) return;

    if (
      mode === "pilgrim" &&
      selectedPilgrim &&
      payload.scope === "pilgrim" &&
      payload.pilgrimMobile &&
      formatMobileForLookup(payload.pilgrimMobile) !==
        formatMobileForLookup(selectedPilgrim.mobileNumber)
    ) {
      notify(
        "خطا",
        "این فایل مربوط به زائر دیگری است. زائر درست را انتخاب کنید یا از حالت «کل بخش» استفاده کنید.",
      );
      return;
    }

    previewImport(ownerId, payload, section)
      .then((preview) => {
        if (!preview.valid) {
          notify("خطا", preview.error ?? "فایل قابل واردسازی نیست");
          return;
        }

        if (preview.total === 0) {
          notify("واردسازی", "فایل خالی است");
          return;
        }

        notify("پیش‌نمایش واردسازی", formatImportPreviewMessage(preview), [
          { text: "انصراف", style: "cancel" },
          {
            text: "وارد کردن",
            onPress: async () => {
              setImporting(true);
              try {
                const result = await importSectionData(
                  ownerId,
                  payload,
                  section,
                );
                await invalidateManagementQueries(queryClient);
                const summary = [
                  `${result.created.toLocaleString("fa-IR")} جدید`,
                  `${result.updated.toLocaleString("fa-IR")} به‌روزرسانی`,
                  `${result.skipped.toLocaleString("fa-IR")} رد شده`,
                ].join(" • ");
                notify("موفق", summary);
              } catch (error) {
                notify(
                  "خطا",
                  error instanceof Error ? error.message : "خطا در واردسازی",
                );
              } finally {
                setImporting(false);
              }
            },
          },
        ]);
      })
      .catch((error) => {
        notify(
          "خطا",
          error instanceof Error ? error.message : "خطا در خواندن فایل",
        );
      });
  };

  const handleImport = async () => {
    if (!section || !ownerId) return;

    setImporting(true);
    try {
      const picked = await pickDataSyncFile();
      confirmImport(picked.payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطا در انتخاب فایل";
      if (message !== "انتخاب فایل لغو شد") {
        notify("خطا", message);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleClearPilgrim = () => {
    if (!section || !meta || !selectedPilgrim) return;
    notify(
      meta.pilgrimConfirmTitle,
      meta.pilgrimWarning(selectedPilgrim.fullName),
      [
        { text: "انصراف", style: "cancel" },
        {
          text: "پاک کردن",
          style: "destructive",
          onPress: () => clearPilgrimMutation.mutate(),
        },
      ],
    );
  };

  if (!canManage) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  if (!section || !meta) {
    return (
      <ScreenContainer>
        <AppHeader title="مدیریت" onBack={() => router.back()} />
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>بخش معتبر انتخاب نشده است.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader title={meta.title} onBack={() => router.back()} showLogo />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
        <ModeSwitch
          mode={mode}
          onChange={handleModeChange}
          accent={meta.accent}
        />

        <View style={styles.syncBlock}>
          <Text style={styles.syncTitle}>انتقال داده</Text>
          <Text style={styles.syncHint}>
            {mode === "all"
              ? section === "attendance" || section === "meals"
                ? "ابتدا رزروها را وارد کنید، سپس ورود/خروج یا وعده. رکوردهای تکراری به‌روزرسانی می‌شوند."
                : "خروجی یا ورودی کل این بخش — برای همگام‌سازی بین دستگاه‌ها"
              : selectedPilgrim
                ? `فقط داده‌های «${selectedPilgrim.fullName}»`
                : "پس از انتخاب زائر می‌توانید داده‌های او را صادر یا وارد کنید"}
          </Text>
          <View style={styles.syncActions}>
            <PrimaryButton
              label="خروجی (Export)"
              icon="share-outline"
              variant="secondary"
              loading={exporting}
              disabled={
                mode === "pilgrim"
                  ? !selectedPilgrim
                  : statsQuery.isLoading || (primaryStat?.count ?? 0) === 0
              }
              onPress={handleExport}
              style={styles.syncButton}
            />
            <PrimaryButton
              label="ورودی (Import)"
              icon="download-outline"
              variant="secondary"
              loading={importing}
              onPress={handleImport}
              style={styles.syncButton}
            />
          </View>
        </View>

        {mode === "all" ? (
          statsQuery.isLoading || !stats || !primaryStat ? (
            <Text style={styles.loading}>در حال بارگذاری آمار...</Text>
          ) : (
            <>
              <StatCard
                label={primaryStat.label}
                count={primaryStat.count}
                icon={meta.icon}
                accent={meta.accent}
                soft={meta.soft}
              />

              {section === "pilgrims" ? (
                <View style={styles.relatedBlock}>
                  <Text style={styles.relatedTitle}>آمار بخش‌های مرتبط</Text>
                  <View style={styles.statGrid}>
                    <StatCard
                      label="رزروها"
                      count={stats.reservations}
                      icon="calendar"
                      accent={colors.primary}
                      soft={colors.primaryLight}
                      compact
                    />
                    <StatCard
                      label="ورود و خروج"
                      count={stats.attendanceEvents}
                      icon="log-in"
                      accent="#0369a1"
                      soft="#e0f2fe"
                      compact
                    />
                    <StatCard
                      label="وعده غذایی"
                      count={stats.mealPlans}
                      icon="restaurant"
                      accent="#c2410c"
                      soft="#ffedd5"
                      compact
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.warningBox}>
                <Ionicons
                  name="warning-outline"
                  size={22}
                  color={colors.danger}
                />
                <Text style={styles.warningText}>{meta.allWarning}</Text>
              </View>

              <PrimaryButton
                label="پاک کردن کل اطلاعات این بخش"
                icon="trash-outline"
                variant="dangerOutline"
                loading={clearAllMutation.isPending}
                disabled={primaryStat.count === 0}
                onPress={handleClearAll}
              />
            </>
          )
        ) : (
          <>
            <View style={styles.searchBlock}>
              <Text style={styles.blockTitle}>جستجوی زائر</Text>
              <Text style={styles.blockHint}>
                حداقل ۲ حرف از نام، موبایل یا کد ملی را وارد کنید
              </Text>
              <SearchBar
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setSelectedPilgrim(null);
                }}
                placeholder="نام، موبایل یا کد ملی"
                autoFocus
                embedded
              />
            </View>

            {selectedPilgrim ? (
              <View style={styles.selectedBlock}>
                <View
                  style={[styles.selectedCard, { borderColor: meta.accent }]}
                >
                  <Pressable
                    onPress={() => setSelectedPilgrim(null)}
                    style={styles.changePilgrim}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="تغییر زائر"
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={14}
                      color={meta.accent}
                    />
                    <Text
                      style={[styles.changePilgrimText, { color: meta.accent }]}
                    >
                      تغییر زائر
                    </Text>
                  </Pressable>
                  <View style={styles.selectedHeader}>
                    <View style={styles.selectedText}>
                      <Text style={styles.selectedName}>
                        {selectedPilgrim.fullName}
                      </Text>
                      <Text style={styles.selectedMeta}>
                        {selectedPilgrim.mobileNumber}
                        {selectedPilgrim.nationalId
                          ? ` • ${selectedPilgrim.nationalId}`
                          : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.selectedAvatar,
                        { backgroundColor: meta.soft },
                      ]}
                    >
                      <Ionicons name="person" size={22} color={meta.accent} />
                    </View>
                  </View>

                  {pilgrimStatsQuery.isLoading ||
                  !pilgrimStats ||
                  !pilgrimPrimary ? (
                    <Text style={styles.loadingInline}>
                      در حال خواندن آمار زائر...
                    </Text>
                  ) : (
                    <>
                      {section !== "pilgrims" ? (
                        <StatCard
                          label={pilgrimPrimary.label}
                          count={pilgrimPrimary.count}
                          icon={meta.icon}
                          accent={meta.accent}
                          soft={meta.soft}
                        />
                      ) : null}
                      <View style={styles.selectedStats}>
                        <StatCard
                          label="رزروها"
                          count={pilgrimStats.reservations}
                          icon="calendar"
                          accent={colors.primary}
                          soft={colors.primaryLight}
                          compact
                        />
                        <StatCard
                          label="ورود و خروج"
                          count={pilgrimStats.attendanceEvents}
                          icon="log-in"
                          accent="#0369a1"
                          soft="#e0f2fe"
                          compact
                        />
                        <StatCard
                          label="وعده غذایی"
                          count={pilgrimStats.mealPlans}
                          icon="restaurant"
                          accent="#c2410c"
                          soft="#ffedd5"
                          compact
                        />
                      </View>
                    </>
                  )}
                </View>

                {pilgrimPrimary && !canClearPilgrim ? (
                  <View style={styles.infoBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={22}
                      color={colors.primary}
                    />
                    <Text style={styles.infoText}>
                      {pilgrimPrimary.emptyHint}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.warningBox}>
                    <Ionicons
                      name="warning-outline"
                      size={22}
                      color={colors.danger}
                    />
                    <Text style={styles.warningText}>
                      {meta.pilgrimWarning(selectedPilgrim.fullName)}
                    </Text>
                  </View>
                )}

                <PrimaryButton
                  label={meta.pilgrimClearLabel}
                  icon="trash-outline"
                  variant="dangerOutline"
                  loading={clearPilgrimMutation.isPending}
                  disabled={!canClearPilgrim}
                  onPress={handleClearPilgrim}
                />
              </View>
            ) : !debouncedQuery || debouncedQuery.length < 2 ? (
              <EmptyState
                icon="search-outline"
                title="زائر را پیدا کنید"
                description="پس از انتخاب زائر، فقط اطلاعات مرتبط با همین بخش برای او پاک می‌شود."
              />
            ) : searchQuery.isFetching && searchResults.length === 0 ? (
              <Text style={styles.loading}>در حال جستجو...</Text>
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon="person-outline"
                title="زائری پیدا نشد"
                description="با مشخصات واردشده نتیجه‌ای نیست."
              />
            ) : (
              <View style={styles.results}>
                <Text style={styles.relatedTitle}>
                  {searchResults.length.toLocaleString("fa-IR")} نتیجه — یکی را
                  انتخاب کنید
                </Text>
                {searchResults.slice(0, 12).map((pilgrim) => (
                  <Pressable
                    key={pilgrim.id}
                    onPress={() => setSelectedPilgrim(pilgrim)}
                    style={({ pressed }) => [
                      styles.resultCard,
                      pressed && styles.resultCardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`انتخاب ${pilgrim.fullName}`}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={colors.textSubtle}
                    />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{pilgrim.fullName}</Text>
                      <Text style={styles.resultMeta}>
                        {pilgrim.mobileNumber}
                        {pilgrim.nationalId ? ` • ${pilgrim.nationalId}` : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.resultAvatar,
                        { backgroundColor: meta.soft },
                      ]}
                    >
                      <Ionicons name="person" size={18} color={meta.accent} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  modeSwitch: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.borderLight,
  },
  modeChip: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  modeChipPressed: {
    opacity: 0.85,
  },
  modeChipLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  modeChipLabelActive: {
    color: "#fff",
  },
  syncBlock: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  syncTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  syncHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  syncActions: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  syncButton: {
    flex: 1,
  },
  loading: {
    textAlign: "center",
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    marginTop: spacing.xl,
  },
  loadingInline: {
    textAlign: "center",
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  fallbackText: {
    fontFamily: fontFamilies.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
  statCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statCardCompact: {
    flex: 1,
    minWidth: "30%",
    padding: spacing.md,
    gap: spacing.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconCompact: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  statText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  statLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  statCount: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    textAlign: "right",
    writingDirection: "rtl",
  },
  statCountCompact: {
    fontSize: 18,
  },
  relatedBlock: {
    gap: spacing.sm,
  },
  relatedTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  statGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  warningBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 22,
    color: colors.danger,
    textAlign: "right",
    writingDirection: "rtl",
  },
  searchBlock: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  blockTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  blockHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
  },
  results: {
    gap: spacing.sm,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resultCardPressed: {
    opacity: 0.8,
    backgroundColor: colors.borderLight,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  resultName: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  resultMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  selectedBlock: {
    gap: spacing.md,
  },
  selectedCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  changePilgrim: {
    alignSelf: "flex-start",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  changePilgrimText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  selectedName: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  selectedMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  selectedStats: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  infoBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 22,
    color: colors.primary,
    textAlign: "right",
    writingDirection: "rtl",
  },
});
