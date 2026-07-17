import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInputProps,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  ScrollViewProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Text, TextInput } from "@/src/lib/fonts";
import { formatPersianNumber } from "@/src/lib/persianDate";
import {
  colors,
  formTypography,
  radius,
  spacing,
  typography,
} from "@/src/lib/theme";

type GuestCountSummaryProps = {
  male: number;
  female: number;
};

const guestCountColors = {
  male: "#3b82f6",
  female: "#ec4899",
} as const;

export function GuestCountSummary({ male, female }: GuestCountSummaryProps) {
  const total = male + female;

  return (
    <View style={styles.guestCountWrap}>
      <View style={styles.guestCountPart}>
        <Text style={[styles.guestCountText, styles.guestCountMale]}>
          {formatPersianNumber(male)}
        </Text>
        <Ionicons
          name="man-outline"
          size={16}
          color={guestCountColors.male}
        />
      </View>
      <View style={styles.guestCountPart}>
        <Text style={[styles.guestCountText, styles.guestCountFemale]}>
          {formatPersianNumber(female)}
        </Text>
        <Ionicons
          name="woman-outline"
          size={16}
          color={guestCountColors.female}
        />
      </View>
      {total > 0 ? (
        <Text style={styles.guestCountTotal}>
          ({formatPersianNumber(total)})
        </Text>
      ) : null}
    </View>
  );
}

type ScreenContainerProps = {
  children: React.ReactNode;
};

export function ScreenContainer({ children }: ScreenContainerProps) {
  return <View style={styles.container}>{children}</View>;
}

type ScreenBodyProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** ناحیهٔ قابل اسکرول زیر هدر — برای جلوگیری از ارتفاع صفر ScrollView */
export function ScreenBody({ children, style }: ScreenBodyProps) {
  return <View style={[styles.screenBody, style]}>{children}</View>;
}

/** اسکرول پایدار روی اندروید: wrapper با flex:1 + ScrollView با ارتفاع محدود */
export function ScreenScroll({
  children,
  contentContainerStyle,
  style,
  ...rest
}: ScrollViewProps) {
  return (
    <View style={styles.screenScrollArea}>
      <ScrollView
        style={[styles.screenScroll, style]}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
}

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  /** آیکن جستجو در انتهای کادر — با کلیک جستجو انجام می‌شود */
  onSearchPress?: () => void;
  autoFocus?: boolean;
  /** بدون حاشیه افقی — برای قرارگیری کنار شمارنده */
  embedded?: boolean;
  /** بدون فاصله از لبه راست صفحه */
  flushRight?: boolean;
};

type ToolbarIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  active?: boolean;
  showBadge?: boolean;
};

export function ToolbarIconButton({
  icon,
  onPress,
  accessibilityLabel,
  active = false,
  showBadge = false,
}: ToolbarIconButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.toolbarIconButton,
        active && styles.toolbarIconButtonActive,
        pressed && styles.toolbarIconButtonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? colors.primaryDark : colors.textMuted}
      />
      {showBadge ? <View style={styles.toolbarIconBadge} /> : null}
    </Pressable>
  );
}

export const SearchBar = memo(function SearchBar({
  value,
  onChangeText,
  placeholder = "جستجو...",
  onSubmit,
  onSearchPress,
  autoFocus = false,
  embedded = false,
  flushRight = false,
}: SearchBarProps) {
  const inputRef = useRef<import("react-native").TextInput>(null);

  const scheduleFocus = useCallback(() => {
    const delay = Platform.OS === "android" ? 350 : 150;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    return scheduleFocus();
  }, [autoFocus, scheduleFocus]);

  useFocusEffect(
    useCallback(() => {
      if (!autoFocus) return;
      return scheduleFocus();
    }, [autoFocus, scheduleFocus]),
  );

  const handleSubmit = onSearchPress ?? onSubmit;

  return (
    <View
      style={[
        styles.searchWrap,
        embedded && styles.searchWrapEmbedded,
        flushRight && styles.searchWrapFlushRight,
        onSearchPress && styles.searchWrapTrailingIcon,
      ]}
      collapsable={false}
    >
      {onSearchPress ? (
        <>
          <TextInput
            ref={inputRef}
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
            autoFocus={autoFocus}
            underlineColorAndroid="transparent"
            importantForAutofill="no"
            onSubmitEditing={handleSubmit}
          />
          <Pressable
            onPress={onSearchPress}
            style={({ pressed }) => [
              styles.searchTrailingButton,
              pressed && styles.searchTrailingButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="جستجو"
          >
            <Ionicons name="search" size={18} color={colors.primary} />
          </Pressable>
        </>
      ) : (
        <>
          <Ionicons name="search" size={18} color={colors.textSubtle} />
          <TextInput
            ref={inputRef}
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
            autoFocus={autoFocus}
            underlineColorAndroid="transparent"
            importantForAutofill="no"
            onSubmitEditing={handleSubmit}
          />
        </>
      )}
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

type SearchToolbarProps = {
  children: React.ReactNode;
};

/** ردیف جستجو + شمارنده کنار هم */
export function SearchToolbar({ children }: SearchToolbarProps) {
  return <View style={styles.searchRow}>{children}</View>;
}

type SearchToolbarFieldProps = {
  children: React.ReactNode;
};

/** اسلات انعطاف‌پذیر برای SearchBar داخل SearchToolbar */
export function SearchToolbarField({ children }: SearchToolbarFieldProps) {
  return <View style={styles.searchRowSlot}>{children}</View>;
}

type AppInputProps = TextInputProps & {
  label: string;
  error?: string | null;
  required?: boolean;
};

export function AppInput({
  label,
  error,
  required = false,
  style,
  onFocus,
  onBlur,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        {required ? <Text style={styles.requiredMark}>*</Text> : null}
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
              style={
                mirroredIcons.has(icon) ? styles.rtlDirectionalIcon : undefined
              }
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
  /** وقتی false باشد دکمه با باز شدن کیبورد جابه‌جا نمی‌شود */
  avoidKeyboard?: boolean;
};

export function StickyBottomAction({
  children,
  avoidKeyboard = true,
}: StickyBottomActionProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        styles.stickyAction,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      {children}
    </View>
  );

  if (!avoidKeyboard) {
    return content;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "position"}
      keyboardVerticalOffset={0}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

type FloatingActionButtonProps = {
  label?: string;
  tooltip?: string;
  onPress: () => void;
  bottomOffset?: number;
};

export function FloatingActionButton({
  label = "افزودن",
  tooltip,
  onPress,
  bottomOffset = 0,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.floatingActionContainer,
        {
          bottom:
            Math.max(insets.bottom, spacing.md) + spacing.sm + bottomOffset,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.floatingActionRow} pointerEvents="box-none">
        {tooltip ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.floatingActionTooltip,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={tooltip}
          >
            <View style={styles.floatingActionTooltipIcon}>
              <Ionicons
                name="cube-outline"
                size={18}
                color={colors.primaryDark}
              />
            </View>
            <Text style={styles.floatingActionTooltipText}>{tooltip}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.floatingAction,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>
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
  badgeCaption?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  guestCounts?: GuestCountSummaryProps;
  footer?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ListCard({
  title,
  titleIcon,
  subtitle,
  meta,
  details,
  badge,
  badgeCaption,
  badgeColor = colors.primaryLight,
  badgeTextColor = colors.primaryDark,
  guestCounts,
  footer,
  onPress,
  style,
}: ListCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && onPress ? styles.cardPressed : null,
      ]}
    >
      {guestCounts || badgeCaption ? (
        <View style={styles.cardHeaderTop}>
          {badgeCaption ? (
            <Text style={styles.badgeCaption}>{badgeCaption}</Text>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          {guestCounts ? (
            <GuestCountSummary
              male={guestCounts.male}
              female={guestCounts.female}
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.cardHeader}>
        {badge ? (
          <View style={styles.badgeColumn}>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                {badge}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <View style={styles.cardTitleWrap}>
          <View style={styles.cardTitleContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
            {titleIcon ? (
              <Ionicons name={titleIcon} size={18} color={colors.primary} />
            ) : null}
          </View>
        </View>
      </View>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
      {details?.map((detail, index) => (
        <View key={`${detail.icon}-${index}`} style={styles.cardDetailRow}>
          {detail.label ? (
            <View style={styles.cardDetailKeyValue}>
              <Text style={styles.cardDetailValue} numberOfLines={2}>
                {detail.value}
              </Text>
              <Text style={styles.cardDetailLabel}>{detail.label}</Text>
            </View>
          ) : (
            <Text style={styles.cardDetailText}>{detail.text}</Text>
          )}
          <Ionicons name={detail.icon} size={17} color={colors.textMuted} />
        </View>
      ))}
      {footer ? <View style={styles.cardFooter}>{footer}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    flexDirection: "column",
    backgroundColor: colors.background,
  },
  screenBody: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  screenScrollArea: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  screenScroll: {
    flex: 1,
    width: "100%",
  },
  // Explicit RTL row without I18nManager: first child sits on the right
  searchWrap: {
    flexDirection: "row-reverse",
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
  searchWrapEmbedded: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  searchWrapFlushRight: {
    marginRight: 0,
  },
  searchWrapTrailingIcon: {
    flexDirection: "row-reverse",
    paddingLeft: spacing.xs,
  },
  searchTrailingButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchTrailingButtonPressed: {
    opacity: 0.75,
    backgroundColor: colors.borderLight,
  },
  toolbarIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarIconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  toolbarIconButtonPressed: {
    opacity: 0.88,
  },
  toolbarIconBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  searchStickyWrap: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
    zIndex: 1,
  },
  searchRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  searchRowSlot: {
    flex: 1,
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    textAlign: "right",
    writingDirection: "rtl",
  },
  field: {
    width: "100%",
    alignItems: "stretch",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  labelRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 2,
  },
  label: {
    ...formTypography.label,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  requiredMark: {
    ...formTypography.label,
    color: colors.danger,
    fontWeight: "700",
    lineHeight: 20,
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
  buttonContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonLabel: {
    ...typography.label,
    fontSize: 15,
    textAlign: "center",
  },
  buttonLabelCompact: {
    ...formTypography.button,
    textAlign: "center",
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
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    zIndex: 10,
    alignItems: "center",
  },
  floatingActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  floatingActionTooltip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    elevation: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingActionTooltipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  floatingActionTooltipText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
    textAlign: "right",
    writingDirection: "rtl",
  },
  floatingAction: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
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
  cardHeaderTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  guestCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    flexShrink: 1,
  },
  guestCountPart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  guestCountText: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: "700",
  },
  guestCountMale: {
    color: guestCountColors.male,
  },
  guestCountFemale: {
    color: guestCountColors.female,
  },
  guestCountTotal: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSubtle,
  },
  // LTR engine: badge on left, title cluster on right
  cardHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerSpacer: {
    width: 1,
  },
  cardTitleWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  cardTitleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: "right",
    writingDirection: "rtl",
  },
  badgeColumn: {
    alignItems: "flex-start",
    gap: 4,
  },
  badgeCaption: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSubtle,
    textAlign: "left",
    writingDirection: "rtl",
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
  // LTR engine: icon on right, label on right, value on left
  cardDetailRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardDetailKeyValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardDetailLabel: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  cardDetailValue: {
    ...typography.body,
    flexShrink: 1,
    color: colors.text,
    fontWeight: "600",
    textAlign: "left",
  },
  cardDetailText: {
    ...typography.body,
    flex: 1,
    color: colors.textMuted,
    textAlign: "right",
    writingDirection: "rtl",
  },
  cardFooter: {
    width: "100%",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
