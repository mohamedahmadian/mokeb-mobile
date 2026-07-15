import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { DataSyncPayload } from "@/src/services/data-sync";
import { parseDataSyncPayload } from "@/src/services/data-sync";

const JSON_MIME = "application/json";

const DOCUMENT_PICKER_UNAVAILABLE =
  "انتخاب فایل در این نسخه اپ فعال نیست. یک‌بار dev build را دوباره بسازید (expo run:android یا eas build --profile development).";

async function loadDocumentPicker() {
  try {
    return await import("expo-document-picker");
  } catch {
    throw new Error(DOCUMENT_PICKER_UNAVAILABLE);
  }
}

export async function shareDataSyncExport(
  payload: DataSyncPayload,
  filename: string,
): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error("فضای ذخیره‌سازی در دسترس نیست");

  const fileUri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("اشتراک‌گذاری فایل در این دستگاه پشتیبانی نمی‌شود");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: JSON_MIME,
    dialogTitle: "خروجی داده",
    UTI: "public.json",
  });
}

export async function pickDataSyncFile(): Promise<{
  payload: DataSyncPayload;
  name: string;
}> {
  const DocumentPicker = await loadDocumentPicker();

  let picked: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
  try {
    picked = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/json", "public.json", "*/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ExpoDocumentPicker") || message.includes("native module")) {
      throw new Error(DOCUMENT_PICKER_UNAVAILABLE);
    }
    throw error;
  }

  if (picked.canceled || !picked.assets?.length) {
    throw new Error("انتخاب فایل لغو شد");
  }

  const asset = picked.assets[0];
  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return {
    payload: parseDataSyncPayload(raw),
    name: asset.name ?? "import.json",
  };
}
