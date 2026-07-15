import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { useRouter } from "expo-router";
import { runAppBackHandlers } from "@/src/hooks/useAppBackHandler";
import { notify } from "@/src/lib/notify";

/**
 * دکمه Back اندروید را با همان منطق دکمه بازگشت هدر هم‌راستا می‌کند:
 * ۱) هندلر صفحه/فرم فعلی (مثلاً بستن فرم)
 * ۲) تاریخچه ناوبری
 * ۳) تأیید خروج از برنامه
 */
export function AndroidBackHandler() {
  const router = useRouter();
  const confirmingExit = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      if (runAppBackHandlers()) {
        return true;
      }

      if (router.canGoBack()) {
        router.back();
        return true;
      }

      if (confirmingExit.current) {
        return true;
      }

      confirmingExit.current = true;
      notify(
        "خروج از برنامه",
        "آیا مطمئن هستید که می‌خواهید از برنامه خارج شوید؟",
        [
          {
            text: "انصراف",
            style: "cancel",
            onPress: () => {
              confirmingExit.current = false;
            },
          },
          {
            text: "خروج",
            style: "destructive",
            onPress: () => {
              confirmingExit.current = false;
              BackHandler.exitApp();
            },
          },
        ],
      );
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [router]);

  return null;
}
