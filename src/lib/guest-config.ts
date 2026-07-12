import Constants from "expo-constants";

/** Base URL of the admin-panel guest site (for pilgrim card links in SMS/QR). */
export function getGuestBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as
    | { guestBaseUrl?: string }
    | undefined;
  return extra?.guestBaseUrl?.trim().replace(/\/$/, "") ?? "";
}
