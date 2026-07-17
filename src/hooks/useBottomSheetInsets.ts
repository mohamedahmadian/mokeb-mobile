import { useEffect, useState } from "react";
import { Keyboard, Platform, type KeyboardEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/src/lib/theme";

/** Android 3-button navigation bar height when system insets are zero. */
const ANDROID_NAV_BAR_FALLBACK = 48;

export function useBottomSheetPadding(): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS === "android") {
    return Math.max(insets.bottom, ANDROID_NAV_BAR_FALLBACK);
  }

  return Math.max(insets.bottom, spacing.md);
}

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (event: KeyboardEvent) => {
      setHeight(event.endCoordinates.height);
    };
    const onHide = () => setHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
