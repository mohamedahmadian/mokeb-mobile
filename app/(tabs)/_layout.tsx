import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamilies } from "@/src/lib/fonts";
import { colors, typography } from "@/src/lib/theme";

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  color,
  focused,
  size = 22,
}: {
  name: TabIconName;
  color: string | import("react-native").ColorValue;
  focused: boolean;
  size?: number;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as TabIconName)}
      size={size}
      color={String(color)}
      style={name === "log-in" ? styles.rtlDirectionalIcon : undefined}
    />
  );
}

function DashboardTabIcon({
  color,
  focused,
}: {
  color: string | import("react-native").ColorValue;
  focused: boolean;
}) {
  return (
    <View style={[styles.dashboardButton, focused && styles.dashboardButtonActive]}>
      <Ionicons
        name={focused ? "grid" : "grid-outline"}
        size={26}
        color={focused ? "#fff" : String(color)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rtlDirectionalIcon: {
    transform: [{ scaleX: -1 }],
  },
  dashboardButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 3,
    borderColor: colors.surface,
    elevation: 4,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dashboardButtonActive: {
    backgroundColor: colors.primary,
  },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          display: "flex",
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 68 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          elevation: 8,
          shadowColor: "#0f172a",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontFamily: fontFamilies.medium,
          fontSize: 11,
          marginBottom: 4,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {/* ترتیب بصری RTL: راست → چپ = زائر، رزرو، داشبورد، ورود و خروج، وعده */}
      <Tabs.Screen
        name="pilgrims"
        options={{
          title: "زائر",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "رزرو",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "داشبورد",
          tabBarIcon: ({ color, focused }) => (
            <DashboardTabIcon color={color} focused={focused} />
          ),
          tabBarLabelStyle: {
            ...typography.caption,
            fontFamily: fontFamilies.medium,
            fontSize: 11,
            marginBottom: 4,
            marginTop: 4,
          },
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "ورود و خروج",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="log-in" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "وعده غذایی",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="restaurant" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: "پروفایل",
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
