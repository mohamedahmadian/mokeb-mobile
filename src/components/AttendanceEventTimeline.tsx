import { Fragment } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { formatTimeFromIso } from "@/src/lib/format-time";
import {
  groupEventsByDate,
  isInEvent,
  isOutEvent,
  reservationEventLabel,
} from "@/src/lib/reservation-events";
import { colors, radius, spacing } from "@/src/lib/theme";
import type { ReservationEvent, ReservationEventType } from "@/src/types";

function EventFlowIcon({
  fromType,
  toType,
}: {
  fromType: ReservationEventType;
  toType: ReservationEventType;
}) {
  const fromIn = isInEvent(fromType);
  const toIn = isInEvent(toType);
  const iconName =
    fromIn && toIn ? "log-in-outline" : !fromIn && !toIn ? "log-out-outline" : fromIn ? "log-out-outline" : "log-in-outline";
  const color =
    fromIn && toIn
      ? colors.success
      : !fromIn && !toIn
        ? colors.danger
        : colors.warning;

  return <Ionicons name={iconName} size={14} color={color} />;
}

function EventTimeBadge({ event }: { event: ReservationEvent }) {
  const isOut = isOutEvent(event.eventType);
  const time = formatTimeFromIso(event.createdAt) || "—";
  const label = reservationEventLabel[event.eventType];

  return (
    <View
      style={[
        styles.eventBadge,
        isOut ? styles.eventBadgeOut : styles.eventBadgeIn,
      ]}
    >
      <View
        style={[
          styles.eventIconWrap,
          isOut ? styles.eventIconWrapOut : styles.eventIconWrapIn,
        ]}
      >
        <Ionicons
          name={isOut ? "log-out-outline" : "log-in-outline"}
          size={12}
          color={isOut ? colors.danger : colors.success}
        />
      </View>
      <View style={styles.eventTextWrap}>
        <Text style={[styles.eventLabel, isOut ? styles.eventLabelOut : styles.eventLabelIn]}>
          {label}
        </Text>
        <Text style={styles.eventTime}>{time}</Text>
      </View>
    </View>
  );
}

type AttendanceEventTimelineProps = {
  events: ReservationEvent[];
  loading?: boolean;
};

export function AttendanceEventTimeline({
  events,
  loading = false,
}: AttendanceEventTimelineProps) {
  if (loading) {
    return (
      <ActivityIndicator
        color={colors.primary}
        style={styles.loader}
      />
    );
  }

  if (!events.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>هنوز رویداد ورود/خروجی ثبت نشده است.</Text>
      </View>
    );
  }

  const dayGroups = groupEventsByDate(events);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تاریخچه ورود و خروج</Text>
      {dayGroups.map((day) => (
        <View key={day.dateKey} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <View style={styles.dayIcon}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.dayHeaderText}>
              <Text style={styles.dayLabel}>{day.dateLabel}</Text>
              <Text style={styles.dayMeta}>
                {day.events.length.toLocaleString("fa-IR")} رویداد
              </Text>
            </View>
          </View>

          <View style={styles.timelineRow}>
            {day.events.map((event, index) => (
              <Fragment key={event.id}>
                <EventTimeBadge event={event} />
                {index < day.events.length - 1 ? (
                  <EventFlowIcon
                    fromType={event.eventType}
                    toType={day.events[index + 1].eventType}
                  />
                ) : null}
              </Fragment>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
  },
  loader: {
    marginVertical: spacing.md,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    writingDirection: "rtl",
  },
  dayCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dayHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderText: {
    flex: 1,
    alignItems: "flex-end",
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  dayMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
    writingDirection: "rtl",
  },
  timelineRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  eventBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
  },
  eventBadgeIn: {
    backgroundColor: colors.successLight,
    borderColor: "#86efac",
  },
  eventBadgeOut: {
    backgroundColor: colors.dangerLight,
    borderColor: "#fca5a5",
  },
  eventIconWrap: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  eventIconWrapIn: {
    backgroundColor: "rgba(5, 150, 105, 0.12)",
  },
  eventIconWrapOut: {
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },
  eventTextWrap: {
    alignItems: "flex-end",
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  eventLabelIn: {
    color: colors.success,
  },
  eventLabelOut: {
    color: colors.danger,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    writingDirection: "ltr",
  },
});
