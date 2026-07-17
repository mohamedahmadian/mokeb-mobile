import { Ionicons } from "@expo/vector-icons";
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/src/lib/fonts";
import { useRouter } from "expo-router";
import { AppHeader } from "@/src/components/AppHeader";
import { NewReservationFab } from "@/src/components/NewReservationFab";
import { ScreenContainer } from "@/src/components/ui";
import { formatPersianNumber } from "@/src/lib/persianDate";
import { fontFamilies } from "@/src/lib/fonts";
import { colors, radius, spacing, typography } from "@/src/lib/theme";

const SUPPORT_PHONES = ["09159103070", "09152649688"] as const;

const MESSAGE_PARAGRAPHS = [
  "موکب‌دار محترم، امیدواریم که این سامانه بتواند در زمینه مدیریت زائرین به شما کمک کند و راحت‌تر بتوانید امور مربوط به اسکان و ارائه خدمات به زائرین محترم اهل بیت علیهم‌السلام را انجام دهید.",
  "اگر پیشنهادی دارید که فکر می‌کنید می‌تواند مفید واقع باشد، یا مشکلاتی در سامانه مشاهده کردید که در مدیریت شما مشکل ایجاد می‌کند، لطفاً با ما در میان بگذارید.",
  "سعی می‌کنیم در سریع‌ترین زمان ممکن به شما عزیزان خدمت‌رسانی کنیم.",
] as const;

function formatPhoneDisplay(phone: string) {
  const grouped = `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  return grouped.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function PhoneCard({ phone }: { phone: string }) {
  const handleCall = () => {
    void Linking.openURL(`tel:${phone}`);
  };

  return (
    <Pressable
      onPress={handleCall}
      style={({ pressed }) => [styles.phoneCard, pressed && styles.phoneCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`تماس با ${formatPhoneDisplay(phone)}`}
    >
      <View style={styles.phoneIconWrap}>
        <Ionicons name="call" size={22} color={colors.primary} />
      </View>
      <View style={styles.phoneTextWrap}>
        <Text style={styles.phoneLabel}>شماره تماس</Text>
        <Text style={styles.phoneNumber}>{formatPhoneDisplay(phone)}</Text>
      </View>
      <View style={styles.phoneAction}>
        <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function AboutUsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <AppHeader title="درباره ما" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.logoWrap}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>سامانه مدیریت موکب</Text>
          <Text style={styles.heroSubtitle}>همراه شما در خدمت‌رسانی به زائرین</Text>
        </View>

        <View style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <View style={styles.messageIconWrap}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.messageTitle}>پیام ما به شما</Text>
          </View>

          {MESSAGE_PARAGRAPHS.map((paragraph, index) => (
            <View key={paragraph} style={styles.paragraphWrap}>
              <View style={styles.paragraphBullet}>
                <Text style={styles.paragraphIndex}>
                  {formatPersianNumber(index + 1)}
                </Text>
              </View>
              <Text style={styles.paragraphText}>{paragraph}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <Ionicons name="headset-outline" size={20} color={colors.accent} />
            <Text style={styles.contactTitle}>پشتیبانی و ارتباط</Text>
          </View>
          <Text style={styles.contactHint}>
            برای پیشنهاد، گزارش مشکل یا راهنمایی، با یکی از شماره‌های زیر تماس
            بگیرید.
          </Text>

          <View style={styles.phoneList}>
            {SUPPORT_PHONES.map((phone) => (
              <PhoneCard key={phone} phone={phone} />
            ))}
          </View>
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            پاسخگویی در سریع‌ترین زمان ممکن
          </Text>
        </View>
      </ScrollView>

      <NewReservationFab />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#d7e3f2",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(74, 111, 165, 0.12)",
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  logo: {
    width: 58,
    height: 58,
  },
  heroTitle: {
    ...typography.title,
    color: colors.primaryDark,
    textAlign: "center",
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  messageHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  messageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  messageTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
    flex: 1,
  },
  paragraphWrap: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  paragraphBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  paragraphIndex: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    color: colors.accent,
  },
  paragraphText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    lineHeight: 26,
  },
  contactSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  contactHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  contactTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  contactHint: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
  phoneList: {
    gap: spacing.sm,
  },
  phoneCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  phoneCardPressed: {
    backgroundColor: colors.primaryLight,
    borderColor: "#d7e3f2",
  },
  phoneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneTextWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  phoneLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  phoneNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    color: colors.primaryDark,
    marginTop: 2,
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  phoneAction: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  footerNote: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  footerNoteText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
