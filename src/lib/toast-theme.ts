import type { CSSProperties } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import { fontFamilies } from "@/src/lib/fonts";
import { colors, radius, rtlText } from "@/src/lib/theme";

const rtlTitle: TextStyle = {
  ...rtlText,
  fontFamily: fontFamilies.medium,
  fontSize: 15,
  lineHeight: 22,
  width: "100%",
};

const rtlDescription: TextStyle = {
  ...rtlText,
  fontFamily: fontFamilies.regular,
  fontSize: 13,
  lineHeight: 20,
  width: "100%",
};

const toastShell: ViewStyle = {
  direction: "rtl",
  borderRadius: radius.lg,
  borderCurve: "continuous",
  marginHorizontal: 16,
  paddingVertical: 14,
  paddingHorizontal: 14,
  shadowColor: "#0f172a",
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

function variantAccent(accent: string, background: string, border: string): ViewStyle {
  return {
    ...toastShell,
    backgroundColor: background,
    borderWidth: 1,
    borderColor: border,
    borderRightWidth: 4,
    borderRightColor: accent,
  };
}

export const nativeToastOptions = {
  toastContainerStyle: {
    width: "100%",
    direction: "rtl",
  } satisfies ViewStyle,
  toastContentStyle: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
  } satisfies ViewStyle,
  textContainerStyle: {
    flex: 1,
    alignItems: "stretch",
  } satisfies ViewStyle,
  titleStyle: rtlTitle,
  descriptionStyle: rtlDescription,
  closeButtonStyle: {
    alignSelf: "flex-start",
    marginTop: 2,
  } satisfies ViewStyle,
  success: variantAccent(colors.success, "#f0fdf8", "#a7f3d0"),
  error: variantAccent(colors.danger, "#fef7f7", "#fecaca"),
  warning: variantAccent(colors.warning, "#fffbeb", "#fde68a"),
  info: variantAccent(colors.primary, colors.surface, colors.border),
};

export const webToastOptions = {
  style: {
    direction: "rtl",
    borderRadius: `${radius.lg}px`,
    padding: "14px 16px",
    fontFamily: fontFamilies.regular,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
    border: `1px solid ${colors.border}`,
    borderRight: `4px solid ${colors.primary}`,
    textAlign: "right",
    width: "100%",
  } as CSSProperties,
  classNames: {
    toast: "mokeb-toast",
    title: "mokeb-toast-title",
    description: "mokeb-toast-description",
  },
};
