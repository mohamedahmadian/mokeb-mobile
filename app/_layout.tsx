import { useEffect } from "react";
import { I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { NotifyProvider } from "@/src/contexts/NotifyContext";
import { AppToaster } from "@/src/components/AppToaster";
import { NotifyBridge } from "@/src/components/NotifyBridge";
import { AndroidBackHandler } from "@/src/components/AndroidBackHandler";
import { fontAssets } from "@/src/lib/fonts";
import { colors } from "@/src/lib/theme";

// Keep the native layout engine LTR. Persian RTL is applied explicitly via
// styles (textAlign/row-reverse). forceRTL on Android flips textAlign and
 // breaks the whole app after install.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
I18nManager.swapLeftAndRightInRTL(false);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (user && inAuthGroup) {
      router.replace("/(tabs)/dashboard");
    }
  }, [user, isReady, segments, router]);

  if (isLoading) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotifyProvider>
              <NotifyBridge />
              <AndroidBackHandler />
              <AuthGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      flex: 1,
                      backgroundColor: colors.background,
                    },
                    animation: "fade_from_bottom",
                  }}
                >
                  <Stack.Screen name="index" options={{ animation: "none" }} />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" />
                </Stack>
              </AuthGate>
              <AppToaster />
            </NotifyProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
