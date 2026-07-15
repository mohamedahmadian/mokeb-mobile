import { Ionicons } from "@expo/vector-icons";
import {
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Text } from "@/src/lib/fonts";
import { buildMawkibLocationMapUrl, hasValidCoords } from "@/src/lib/geo";
import {
  formatPresenceStayWeekdays,
  getPilgrimCardWeekdayAccentForStayStart,
} from "@/src/lib/pilgrim-card-weekday";
import {
  buildPilgrimCardUrl,
  type PilgrimCardDetails,
} from "@/src/lib/reservation-track";
import {
  formatPersianDateRange,
  formatPersianNumber,
} from "@/src/lib/persianDate";

const CARD_TEAL = "#466766";
const CARD_TEAL_LIGHT = "#eff5f4";

function CircleIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.circleIcon}>
      <Ionicons name={name} size={14} color={CARD_TEAL} />
    </View>
  );
}

function StatColumn({
  icon,
  label,
  value,
  subValue,
  valueDir,
  flex = 1,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subValue?: string;
  valueDir?: "ltr" | "rtl";
  flex?: number;
}) {
  return (
    <View style={[styles.statColumn, { flex }]}>
      <CircleIcon name={icon} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          valueDir === "ltr" ? styles.ltrValueText : null,
        ]}
      >
        {value}
      </Text>
      {subValue ? <Text style={styles.statSubValue}>{subValue}</Text> : null}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueDir,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueDir?: "ltr" | "rtl";
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailKey}>
        <Text style={styles.detailLabel}>{label}</Text>
        <CircleIcon name={icon} />
      </View>
      <Text
        style={[
          styles.detailValue,
          valueDir === "ltr" ? styles.detailValueLtr : null,
        ]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function CompanionValue({ male, female }: { male: number; female: number }) {
  const total = male + female;
  if (total === 0) {
    return <Text style={styles.statValue}>۰</Text>;
  }

  return (
    <View style={styles.companionWrap}>
      {male > 0 ? (
        <View style={styles.companionPart}>
          <Text style={styles.companionText}>{formatPersianNumber(male)}</Text>
          <Ionicons name="man-outline" size={12} color={CARD_TEAL} />
        </View>
      ) : null}
      {female > 0 ? (
        <View style={styles.companionPart}>
          <Text style={styles.companionText}>
            {formatPersianNumber(female)}
          </Text>
          <Ionicons name="woman-outline" size={12} color={CARD_TEAL} />
        </View>
      ) : null}
      {total > 0 ? (
        <Text style={styles.companionTotal}>
          ({formatPersianNumber(total)})
        </Text>
      ) : null}
    </View>
  );
}

type PilgrimCardProps = {
  details: PilgrimCardDetails;
  style?: StyleProp<ViewStyle>;
};

export function PilgrimCard({ details, style }: PilgrimCardProps) {
  const { reservation } = details;
  const weekdayAccent = getPilgrimCardWeekdayAccentForStayStart(
    reservation.reservationDate,
  );
  const cardUrl = buildPilgrimCardUrl(reservation.trackingCode);
  const stayRange = formatPersianDateRange(
    reservation.reservationDate,
    reservation.reservationEndDate ?? reservation.reservationDate,
  );
  const stayWeekdays = formatPresenceStayWeekdays(
    reservation.reservationDate,
    reservation.reservationEndDate,
  );
  const mawkibAddress = details.mawkibAddress?.trim() || "—";
  const neshanAddress = details.neshanAddressUrl?.trim() || "—";
  const ownerName = details.ownerName?.trim() || "—";
  const ownerPhone = details.ownerPhone?.trim() || "—";
  const locationGeoUrl = hasValidCoords(
    details.mawkibLatitude,
    details.mawkibLongitude,
  )
    ? buildMawkibLocationMapUrl(
        details.mawkibLatitude!,
        details.mawkibLongitude!,
      )
    : null;
  const heroSource =
    details.mawkibImageUrl?.trim() &&
    /^(https?:\/\/|file:\/\/)/i.test(details.mawkibImageUrl.trim())
      ? { uri: details.mawkibImageUrl.trim() }
      : undefined;

  return (
    <View
      style={[
        styles.shell,
        {
          borderColor: weekdayAccent.borderColor,
          backgroundColor: weekdayAccent.color,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.weekdayDot,
          { backgroundColor: weekdayAccent.accentColor },
        ]}
      />
      <View
        style={[
          styles.weekdayBanner,
          { backgroundColor: weekdayAccent.accentColor },
        ]}
      >
        <Text
          style={[styles.weekdayBannerText, { color: weekdayAccent.textOnColor }]}
        >
          {weekdayAccent.label}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.header}>
          <View
            style={[
              styles.headerQr,
              { backgroundColor: weekdayAccent.color },
            ]}
          >
            <QRCode
              value={cardUrl}
              size={68}
              color={weekdayAccent.textOnColor}
              backgroundColor={weekdayAccent.color}
            />
            <Text
              style={[styles.qrLabel, { color: weekdayAccent.textOnColor }]}
            >
              شناسه رزرو
            </Text>
            <Text
              style={[styles.qrCode, { color: weekdayAccent.textOnColor }]}
            >
              {reservation.trackingCode}
            </Text>
          </View>

          <View style={styles.headerHero}>
            <ImageBackground
              source={heroSource}
              style={styles.heroImage}
              imageStyle={styles.heroImageInner}
            >
              <View style={styles.heroOverlay}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {details.pilgrimName}
                </Text>
              </View>
            </ImageBackground>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statColumn, styles.statColumnNarrow]}>
            <CircleIcon name="people-outline" />
            <Text style={styles.statLabel}>تعداد</Text>
            <CompanionValue
              male={reservation.maleGuestCount}
              female={reservation.femaleGuestCount}
            />
          </View>
          <StatColumn
            icon="calendar-outline"
            label="تاریخ حضور"
            value={stayRange}
            subValue={stayWeekdays}
            flex={2}
          />
          <StatColumn
            icon="call-outline"
            label="موبایل"
            value={reservation.pilgrimMobile}
            valueDir="ltr"
            flex={0.9}
          />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>اطلاعات موکب</Text>
            <Ionicons name="document-text-outline" size={16} color={CARD_TEAL} />
          </View>

          <DetailRow
            icon="person-outline"
            label="مسئول موکب"
            value={`${ownerName} · ${ownerPhone}`}
            valueDir="ltr"
          />
          <DetailRow
            icon="location-outline"
            label="آدرس موکب"
            value={mawkibAddress}
          />
          <DetailRow
            icon="map-outline"
            label="آدرس نشان موکب"
            value={neshanAddress}
          />

          {locationGeoUrl ? (
            <View style={styles.locationBlock}>
              <View style={styles.locationQrWrap}>
                <QRCode value={locationGeoUrl} size={72} color={CARD_TEAL} />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  weekdayDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 999,
    zIndex: 2,
  },
  weekdayBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: "100%",
    alignItems: "flex-end",
  },
  weekdayBannerText: {
    width: "100%",
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    backgroundColor: "#fcfdfd",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  // LTR: QR left, hero right
  header: {
    flexDirection: "row",
    minHeight: 112,
    padding: 8,
    gap: 8,
    width: "100%",
  },
  headerHero: {
    flex: 2,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#78908f",
  },
  heroImage: {
    flex: 1,
    minHeight: 96,
    justifyContent: "flex-end",
  },
  heroImageInner: {
    borderRadius: 10,
  },
  heroOverlay: {
    width: "100%",
    alignItems: "flex-end",
    backgroundColor: "rgba(55, 82, 81, 0.64)",
    padding: 10,
    gap: 6,
  },
  heroTitle: {
    width: "100%",
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
    paddingRight: 4,
  },
  headerQr: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  qrLabel: {
    width: "100%",
    textAlign: "center",
    writingDirection: "rtl",
    fontSize: 10,
    fontWeight: "600",
  },
  qrCode: {
    width: "100%",
    fontSize: 10,
    fontWeight: "700",
    writingDirection: "ltr",
    textAlign: "center",
  },
  // LTR order: companions | date | mobile → mobile sits on the right
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: CARD_TEAL_LIGHT,
    backgroundColor: "#fff",
    width: "100%",
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
    borderLeftWidth: 1,
    borderLeftColor: CARD_TEAL_LIGHT,
  },
  statColumnNarrow: {
    flex: 0.9,
  },
  circleIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: CARD_TEAL_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    width: "100%",
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
  },
  statValue: {
    width: "100%",
    fontSize: 11,
    color: CARD_TEAL,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl",
  },
  statSubValue: {
    width: "100%",
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    writingDirection: "rtl",
  },
  ltrValueText: {
    writingDirection: "ltr",
    textAlign: "center",
    width: "100%",
  },
  companionWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexWrap: "wrap",
    width: "100%",
  },
  companionPart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  companionText: {
    fontSize: 11,
    color: CARD_TEAL,
    fontWeight: "700",
    textAlign: "center",
  },
  companionTotal: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
  },
  panel: {
    margin: 8,
    padding: 10,
    borderRadius: 10,
    alignItems: "stretch",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4ecea",
    shadowColor: "#5f7775",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    gap: 8,
  },
  panelTitleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 2,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: CARD_TEAL,
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailRow: {
    width: "100%",
    alignItems: "stretch",
    gap: 4,
  },
  detailKey: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  detailValue: {
    width: "100%",
    fontSize: 11,
    color: CARD_TEAL,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    paddingRight: 10,
  },
  detailValueLtr: {
    writingDirection: "ltr",
    textAlign: "right",
  },
  locationBlock: {
    width: "100%",
    marginTop: 4,
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(26, 63, 63, 0.12)",
  },
  locationQrWrap: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 10,
  },
});
