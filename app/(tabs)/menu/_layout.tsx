import { Stack } from "expo-router";
import { colors } from "@/src/lib/theme";

export default function MenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.background },
        animation: "slide_from_left",
      }}
    />
  );
}
