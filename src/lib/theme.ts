import { fontFamilies } from "@/src/lib/font-assets";

export const colors = {
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  text: "#1e293b",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  primary: "#4a6fa5",
  primaryDark: "#3d5d8a",
  primaryLight: "#e8eef6",
  accent: "#8b6914",
  accentLight: "#f3ebe0",
  success: "#059669",
  successLight: "#d1fae5",
  warning: "#d97706",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  violet: "#7c3aed",
  violetLight: "#ede9fe",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const rtlText = {
  textAlign: "right" as const,
  writingDirection: "rtl" as const,
};

export const typography = {
  title: { ...rtlText, fontFamily: fontFamilies.bold, fontSize: 20 },
  subtitle: { ...rtlText, fontFamily: fontFamilies.medium, fontSize: 16 },
  body: { ...rtlText, fontFamily: fontFamilies.regular, fontSize: 14 },
  caption: { ...rtlText, fontFamily: fontFamilies.regular, fontSize: 12 },
  label: { ...rtlText, fontFamily: fontFamilies.medium, fontSize: 13 },
};

export const formTypography = {
  label: { ...rtlText, fontFamily: fontFamilies.medium, fontSize: 12 },
  body: { ...rtlText, fontFamily: fontFamilies.regular, fontSize: 13 },
  caption: { ...rtlText, fontFamily: fontFamilies.regular, fontSize: 11 },
  button: { ...rtlText, fontFamily: fontFamilies.medium, fontSize: 14 },
  heading: { ...rtlText, fontFamily: fontFamilies.bold, fontSize: 15 },
  title: { ...rtlText, fontFamily: fontFamilies.medium, fontSize: 13 },
};
