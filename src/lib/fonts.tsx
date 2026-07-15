import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import React from "react";
import { fontFamilies } from "@/src/lib/font-assets";

export { fontFamilies, fontAssets } from "@/src/lib/font-assets";

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

function resolveTextAlign(
  style: StyleProp<TextStyle>,
  requested?: TextStyle["textAlign"] | TextInputProps["textAlign"],
): "left" | "center" | "right" {
  const align =
    requested ?? StyleSheet.flatten(style)?.textAlign ?? "right";
  if (align === "left" || align === "center" || align === "right") {
    return align;
  }
  return "right";
}

export function Text(props: TextProps) {
  const fontFamily = resolveFontFamily(props.style);
  const textAlign = resolveTextAlign(props.style);
  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily,
          writingDirection: "rtl",
          textAlign: "right",
        },
        props.style,
        { textAlign },
      ]}
    />
  );
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function TextInput(props, ref) {
    const fontFamily = resolveFontFamily(props.style);
    const textAlign = resolveTextAlign(props.style, props.textAlign);
    return (
      <RNTextInput
        ref={ref}
        {...props}
        textAlign={textAlign}
        style={[
          {
            fontFamily,
            writingDirection: "rtl",
            textAlign: "right",
          },
          props.style,
          { textAlign },
        ]}
      />
    );
  },
);
