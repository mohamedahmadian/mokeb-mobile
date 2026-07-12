import { Platform } from "react-native";

export const toast =
  Platform.OS === "web"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("sonner").toast
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("sonner-native").toast;

export const Toaster =
  Platform.OS === "web"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("sonner").Toaster
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("sonner-native").Toaster;
