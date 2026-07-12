import { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import { Toaster as WebToaster } from "sonner";
import { Toaster as NativeToaster } from "sonner-native";
import { webToastOptions } from "@/src/lib/toast-theme";

const WEB_TOAST_CSS = `
  [data-sonner-toaster][dir="rtl"] [data-sonner-toast] {
    direction: rtl !important;
    text-align: right !important;
    width: 100% !important;
  }
  [data-sonner-toaster][dir="rtl"] [data-title] {
    direction: rtl !important;
    text-align: right !important;
    width: 100% !important;
    font-family: Vazir-Medium, Vazir, Tahoma, sans-serif !important;
  }
  [data-sonner-toaster][dir="rtl"] [data-description] {
    direction: rtl !important;
    text-align: right !important;
    width: 100% !important;
    font-family: Vazir, Tahoma, sans-serif !important;
  }
`;

export function AppToaster() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const style = document.createElement("style");
    style.setAttribute("data-mokeb-toast-rtl", "true");
    style.textContent = WEB_TOAST_CSS;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  if (Platform.OS === "web") {
    return (
      <WebToaster
        position="top-center"
        dir="rtl"
        closeButton
        offset={16}
        gap={12}
        toastOptions={webToastOptions}
        richColors
        style={{ width: "100%" }}
      />
    );
  }

  return (
    <NativeToaster
      position="top-center"
      offset={56}
      gap={12}
      swipeToDismissDirection="up"
      visibleToasts={4}
      enableStacking
      toastOptions={{
        unstyled: true,
        toastContainerStyle: styles.nativeHost,
      }}
      positionerStyle={styles.positioner}
      style={styles.nativeToaster}
    />
  );
}

const styles = StyleSheet.create({
  nativeToaster: {
    width: "100%",
    alignSelf: "stretch",
  },
  positioner: {
    width: "100%",
    alignSelf: "stretch",
  },
  nativeHost: {
    width: "100%",
    alignSelf: "stretch",
  },
});
