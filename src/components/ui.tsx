import { memo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInputProps,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text, TextInput } from "@/src/lib/fonts";
import { colors, formTypography, radius, spacing, typography } from "@/src/lib/theme";

type ScreenContainerProps = {
  children: React.ReactNode;
};

export function ScreenContainer({ children }: ScreenContainerProps) {
  return <View style={styles.container}>{children}</View>;
}

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
};

export const SearchBar = memo(function SearchBar({
  value,
  onChangeText,
  placeholder = "جستجو...",
  onSubmit,
}: SearchBarProps) {
  return (
    <View style={styles.searchWrap} collapsable={false}>
      <Ionicons name="search" size={18} color={colors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.searchInput}
        textAlign="right"
        returnKeyType="search"
        blurOnSubmit={false}
        autoCorrect={false}
        autoCapitalize="none"
        underlineColorAndroid="transparent"
        importantForAutofill="no"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
});

type SearchBarStickyWrapProps = {
  children: React.ReactNode;
};

export function SearchBarStickyWrap({ children }: SearchBarStickyWrapProps) {
  return (
    <View style={styles.searchStickyWrap} collapsable={false}>
      {children}
    </View>
  );
}

type AppInputProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function AppInput({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        {...props}
        style={[
          styles.input,
          style,
          error ? styles.inputError : null,
          isFocused && styles.inputFocused,
        ]}
        placeholderTextColor={colors.textSubtle}
        textAlign="right"
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "dangerOutline";
  compact?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const mirroredIcons = new Set<keyof typeof Ionicons.glyphMap>([
  "log-in",
  "log-in-outline",
  "log-out",
  "log-out-outline",
  "return-down-back",
  "return-down-back-outline",
]);

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled = false,
  variant = "primary",
  compact = false,
  icon,
  style,
  labelStyle,
}: PrimaryButtonProps) {
  const palette =
    variant === "danger"
      ? { bg: colors.danger, text: "#fff", border: colors.danger }
      : variant === "dangerOutline"
        ? { bg: colors.surface, text: colors.danger, border: colors.border }
        : variant === "secondary"
          ? { bg: colors.surface, text: colors.text, border: colors.border }
          : { bg: colors.primary, text: "#fff", border: colors.primary };

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        pressed && styles.buttonPressed,
        (loading || disabled) && styles.buttonDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={palette.text}
              style={mirroredIcons.has(icon) ? styles.rtlDirectionalIcon : undefined}
            />
          ) : null}
          <Text
            style={[
              styles.buttonLabel,
              compact && styles.buttonLabelCompact,
              { color: palette.text },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type StickyBottomActionProps = {
  children: React.ReactNode;
};

export function StickyBottomAction({ children }: StickyBottomActionProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "position"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.stickyAction,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

type FloatingActionButtonProps = {
  label: string;
  onPress: () => void;
};

export function FloatingActionButton({
  label,
  onPress,
}: FloatingActionButtonProps) {
  return (
    <View style={styles.floatingActionContainer} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.floatingAction,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="add" size={26} color="#fff" />
        <Text style={styles.floatingActionLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

type ListCardProps = {
  title: string;
  titleIcon?: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  meta?: string;
  details?: {
    icon: keyof typeof Ionicons.glyphMap;
    text?: string;
    label?: string;
    value?: string;
  }[];
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  footer?: React.ReactNode;
  onPress?: () => void;
};

export function ListCard({
  title,
  titleIcon,
  subtitle,
  meta,
  details,
  badge,
  badgeColor = colors.primaryLight,
  badgeTextColor = colors.primaryDark,
  footer,
  onPress,
}: ListCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <View style={styles.cardTitleContent}>
            {titleIcon ? (
              <Ionicons name={titleIcon} size={18} color={colors.primary} />
            ) : null}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {subtitle ? (
        <View style={styles.cardTextRow}>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      ) : null}
      {meta ? (
        <View style={styles.cardTextRow}>
          <Text style={styles.cardMeta}>{meta}</Text>
        </View>
      ) : null}
      {details?.map((detail, index) => (
        <View key={`${detail.icon}-${index}`} style={styles.cardDetailRow}>
          <Ionicons name={detail.icon} size={17} color={colors.textMuted} />
          {detail.label ? (
            <View style={styles.cardDetailKeyValue}>
              <Text style={styles.cardDetailLabel}>{detail.label}</Text>
              <Text style={styles.cardDetailValue}>{detail.value}</Text>
            </View>
          ) : (
            <View style={styles.cardDetailTextWrap}>
              <Text style={styles.cardDetailText}>{detail.text}</Text>
            </View>
          )}
        </View>
      ))}
      {footer ? <View style={styles.cardFooter}>{footer}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    direction: "rtl",
  },
  // RTL: با forceRTL فعال، "row" به‌صورت خودکار راست‌به‌چپ عمل می‌کند
  searchWrap: {
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchStickyWrap: {
    backgroundColor: colors.background,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.xs,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    textAlign: "right",
  },
  field: {
    width: "100%",
    alignItems: "stretch",
    direction: "rtl",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  labelRow: {
    width: "100%",
    alignItems: "flex-start",
  },
  label: {
    ...formTypography.label,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  input: {
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    ...formTypography.body,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  error: {
    ...formTypography.caption,
    color: colors.danger,
    textAlign: "right",
    alignSelf: "stretch",
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  // RTL: row با forceRTL = آیکن سمت راست متن، که در فارسی درست است
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonLabel: {
    ...typography.label,
    fontSize: 15,
  },
  buttonLabelCompact: {
    ...formTypography.button,
  },
  rtlDirectionalIcon: {
    transform: [{ scaleX: -1 }],
  },
  stickyAction: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  floatingActionContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.lg,
    zIndex: 10,
    alignItems: "center",
  },
  floatingAction: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    elevation: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingActionLabel: {
    ...typography.label,
    color: "#fff",
    fontSize: 14,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: "center",
  },
  emptyDescription: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  card: {
    width: "100%",
    alignItems: "stretch",
    direction: "rtl",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.borderLight,
  },
  // RTL: عنوان در سمت راست، badge در سمت چپ
  cardHeader: {
    width: "100%",
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
    direction: "rtl",
    alignItems: "stretch",
  },
  cardTitleContent: {
    width: "100%",
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle,
    flex: 1,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  cardTextRow: {
    width: "100%",
    direction: "rtl",
    alignItems: "stretch",
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  cardSubtitle: {
    ...typography.body,
    width: "100%",
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  cardMeta: {
    ...typography.caption,
    width: "100%",
    color: colors.textSubtle,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
  cardDetailRow: {
    width: "100%",
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardDetailTextWrap: {
    flex: 1,
    alignItems: "flex-start",
  },
  cardDetailText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "right",
  },
  cardDetailKeyValue: {
    flex: 1,
    direction: "rtl",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardDetailLabel: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "right",
  },
  cardDetailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    textAlign: "left",
  },
  cardFooter: {
    width: "100%",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
