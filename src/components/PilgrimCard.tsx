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

const rtlText = {
  textAlign: "right" as const,
  writingDirection: "rtl" as const,
  width: "100%" as const,
};

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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subValue?: string;
  valueDir?: "ltr" | "rtl";
}) {
  return (
    <View style={styles.statColumn}>
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
        <CircleIcon name={icon} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.detailValue,
          valueDir === "ltr" ? styles.ltrValueText : null,
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
          <Ionicons name="man-outline" size={12} color={CARD_TEAL} />
          <Text style={styles.companionText}>{formatPersianNumber(male)}</Text>
        </View>
      ) : null}
      {female > 0 ? (
        <View style={styles.companionPart}>
          <Ionicons name="woman-outline" size={12} color={CARD_TEAL} />
          <Text style={styles.companionText}>
            {formatPersianNumber(female)}
          </Text>
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
  const ownerName = details.ownerName?.trim() || "—";
  const ownerPhone = details.ownerPhone?.trim() || "—";
  const locationQrUrl = hasValidCoords(
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
          <View style={styles.headerHero}>
            <ImageBackground
              source={heroSource}
              style={styles.heroImage}
              imageStyle={styles.heroImageInner}
            >
              <View style={styles.heroOverlay}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {details.mawkibName}
                </Text>
                <View style={styles.heroBadge}>
                  <Ionicons name="person-outline" size={12} color="#fff" />
                  <Text style={styles.heroBadgeText} numberOfLines={1}>
                    {details.pilgrimName}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View
            style={[
              styles.headerQr,
              { backgroundColor: weekdayAccent.color },
            ]}
          >
            <View style={styles.qrContent}>
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
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatColumn
            icon="call-outline"
            label="موبایل"
            value={reservation.pilgrimMobile}
            valueDir="ltr"
          />
          <StatColumn
            icon="calendar-outline"
            label="تاریخ حضور"
            value={stayRange}
            subValue={stayWeekdays}
          />
          <View style={styles.statColumn}>
            <CircleIcon name="people-outline" />
            <Text style={styles.statLabel}>تعداد همراهان</Text>
            <CompanionValue
              male={reservation.maleGuestCount}
              female={reservation.femaleGuestCount}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Ionicons name="document-text-outline" size={16} color={CARD_TEAL} />
            <Text style={styles.panelTitle}>اطلاعات موکب</Text>
          </View>

          <DetailRow
            icon="home-outline"
            label="نام موکب"
            value={details.mawkibName}
          />
          <DetailRow
            icon="location-outline"
            label="آدرس"
            value={mawkibAddress}
          />
          <DetailRow
            icon="person-outline"
            label="مسئول موکب"
            value={`${ownerName} · ${ownerPhone}`}
            valueDir="ltr"
          />

          {locationQrUrl ? (
            <View style={styles.locationBlock}>
              <Text style={styles.locationTitle}>موقعیت موکب</Text>
              <View style={styles.locationQrWrap}>
                <QRCode value={locationQrUrl} size={72} color={CARD_TEAL} />
              </View>
              <Text style={styles.locationCaption}>
                اسکن برای باز کردن نقشه (اسنپ، نشان و ...)
              </Text>
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
    direction: "rtl",
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
    direction: "rtl",
    alignItems: "stretch",
  },
  weekdayBannerText: {
    ...rtlText,
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    direction: "rtl",
    backgroundColor: "#fcfdfd",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  header: {
    direction: "rtl",
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
    direction: "rtl",
    alignItems: "stretch",
    backgroundColor: "rgba(55, 82, 81, 0.64)",
    padding: 10,
    gap: 6,
  },
  heroTitle: {
    ...rtlText,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  heroBadge: {
    alignSelf: "flex-start",
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  heroBadgeText: {
    ...rtlText,
    color: "#fff",
    fontSize: 11,
    flexShrink: 1,
    width: undefined,
  },
  headerQr: {
    flex: 1,
    borderRadius: 10,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    direction: "rtl",
    alignItems: "stretch",
  },
  qrContent: {
    width: "100%",
    direction: "rtl",
    alignItems: "center",
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
  statsRow: {
    direction: "rtl",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: CARD_TEAL_LIGHT,
    backgroundColor: "#fff",
    width: "100%",
  },
  statColumn: {
    flex: 1,
    direction: "rtl",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 4,
    borderStartWidth: 1,
    borderStartColor: CARD_TEAL_LIGHT,
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
    ...rtlText,
    fontSize: 10,
    color: "#64748b",
  },
  statValue: {
    ...rtlText,
    fontSize: 11,
    color: CARD_TEAL,
    fontWeight: "700",
  },
  statSubValue: {
    ...rtlText,
    fontSize: 9,
    color: "#94a3b8",
  },
  ltrValueText: {
    writingDirection: "ltr",
    textAlign: "right",
    width: "100%",
  },
  companionWrap: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "flex-start",
    width: "100%",
  },
  companionPart: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  companionText: {
    ...rtlText,
    fontSize: 11,
    color: CARD_TEAL,
    fontWeight: "700",
    width: undefined,
  },
  companionTotal: {
    ...rtlText,
    fontSize: 10,
    color: "#64748b",
    width: undefined,
  },
  panel: {
    margin: 8,
    padding: 10,
    borderRadius: 10,
    direction: "rtl",
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
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  panelTitle: {
    ...rtlText,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: CARD_TEAL,
  },
  detailRow: {
    width: "100%",
    direction: "rtl",
    alignItems: "stretch",
    gap: 4,
  },
  detailKey: {
    width: "100%",
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  detailLabel: {
    ...rtlText,
    flex: 1,
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  detailValue: {
    ...rtlText,
    fontSize: 11,
    color: CARD_TEAL,
    fontWeight: "600",
    alignSelf: "stretch",
  },
  locationBlock: {
    width: "100%",
    direction: "rtl",
    marginTop: 4,
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(26, 63, 63, 0.12)",
  },
  locationTitle: {
    ...rtlText,
    fontSize: 11,
    fontWeight: "700",
    color: CARD_TEAL,
  },
  locationQrWrap: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 10,
  },
  locationCaption: {
    ...rtlText,
    fontSize: 9,
    color: "#64748b",
  },
});
