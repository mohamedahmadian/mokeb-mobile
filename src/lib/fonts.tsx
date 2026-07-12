import {
  StyleSheet,
  I18nManager,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import React from "react";

export const fontFamilies = {
  regular: "Vazir",
  medium: "Vazir-Medium",
  bold: "Vazir-Bold",
} as const;

export const fontAssets = {
  Vazir: require("../../assets/fonts/Vazir.ttf"),
  "Vazir-Medium": require("../../assets/fonts/Vazir-Medium.ttf"),
  "Vazir-Bold": require("../../assets/fonts/Vazir-Bold.ttf"),
} as const;

function resolveFontFamily(style: StyleProp<TextStyle>): string {
  const flat = StyleSheet.flatten(style);
  if (flat?.fontFamily) return flat.fontFamily;

  const weight = flat?.fontWeight;
  if (
    weight === "bold" ||
    weight === "700" ||
    weight === "800" ||
    weight === "900"
  ) {
    return fontFamilies.bold;
  }

  if (
    weight === "500" ||
    weight === "600" ||
    weight === "medium" ||
    weight === "semibold"
  ) {
    return fontFamilies.medium;
  }

  return fontFamilies.regular;
}

/**
 * Map requested alignment to the value React Native will render correctly.
 * When doLeftAndRightSwapInRTL is on, physical left/right are inverted.
 * We always want "right" in styles to mean the visual right side of the screen.
 */
function resolvePhysicalTextAlign(
  style: StyleProp<TextStyle>,
  requested?: TextStyle["textAlign"] | TextInputProps["textAlign"],
): "left" | "center" | "right" {
  const align =
    requested ?? StyleSheet.flatten(style)?.textAlign ?? "right";

  if (align === "center") return "center";

  const swap =
    I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL === true;

  // Authors write "right"/"left" for visual sides. If RN swaps L/R in RTL,
  // invert so the visual result matches the author's intent.
  if (align === "left") return swap ? "right" : "left";
  return swap ? "left" : "right";
}

export function Text(props: TextProps) {
  const fontFamily = resolveFontFamily(props.style);
  const textAlign = resolvePhysicalTextAlign(props.style);
  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily,
          writingDirection: "rtl",
        },
        props.style,
        { textAlign },
      ]}
    />
  );
}

export function TextInput(props: TextInputProps) {
  const fontFamily = resolveFontFamily(props.style);
  const textAlign = resolvePhysicalTextAlign(props.style, props.textAlign);
  return (
    <RNTextInput
      {...props}
      textAlign={textAlign}
      style={[
        {
          fontFamily,
          writingDirection: "rtl",
        },
        props.style,
        { textAlign },
      ]}
    />
  );
}
