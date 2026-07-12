import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { View } from "react-native";

export async function capturePilgrimCardImage(
  viewRef: React.RefObject<View | null>,
): Promise<string> {
  const uri = await captureRef(viewRef, {
    format: "png",
    quality: 1,
    result: "tmpfile",
  });
  if (!uri) {
    throw new Error("خطا در تهیه تصویر زائر کارت");
  }
  return uri;
}

async function persistCardImage(uri: string, trackingCode: string) {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("فضای ذخیره‌سازی در دسترس نیست");
  }

  const filename = `zaeer-kart-${trackingCode}.png`;
  const destination = `${cacheDir}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function sharePilgrimCardImage(
  viewRef: React.RefObject<View | null>,
  trackingCode: string,
) {
  const uri = await capturePilgrimCardImage(viewRef);
  const fileUri = await persistCardImage(uri, trackingCode);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("اشتراک‌گذاری در این دستگاه پشتیبانی نمی‌شود");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "image/png",
    dialogTitle: "اشتراک‌گذاری زائر کارت",
    UTI: "public.png",
  });
}

export async function downloadPilgrimCardImage(
  viewRef: React.RefObject<View | null>,
  trackingCode: string,
) {
  const uri = await capturePilgrimCardImage(viewRef);
  const fileUri = await persistCardImage(uri, trackingCode);

  const permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
  if (!permission.granted) {
    throw new Error("برای ذخیره تصویر، دسترسی به گالری لازم است");
  }

  await MediaLibrary.saveToLibraryAsync(fileUri);
}
