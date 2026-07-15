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
