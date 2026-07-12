import { createElement } from "react";
import { Platform } from "react-native";
import { AppToast, type AppToastVariant } from "@/src/components/AppToast";
import { toast } from "@/src/lib/sonner";
import type { AlertButton } from "@/src/contexts/NotifyContext";

type ConfirmHandler = (options: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}) => void;

type ActionSheetHandler = (options: {
  title: string;
  message?: string;
  buttons: AlertButton[];
}) => void;

let confirmHandler: ConfirmHandler | null = null;
let actionSheetHandler: ActionSheetHandler | null = null;

export function registerNotifyHandlers(handlers: {
  confirm: ConfirmHandler;
  actions?: ActionSheetHandler;
}) {
  confirmHandler = handlers.confirm;
  actionSheetHandler = handlers.actions ?? null;
}

type ToastKind = AppToastVariant;

function inferToastKind(title: string): ToastKind {
  if (title === "موفق") return "success";
  if (title === "خطا") return "error";
  if (title === "توجه" || title === "دسترسی لازم است") return "warning";
  return "info";
}

function showToast(title: string, message?: string, kind?: ToastKind) {
  const variant = kind ?? inferToastKind(title);
  const duration = variant === "error" ? 5000 : 3500;
  const options = message ? { description: message, duration } : { duration };

  if (Platform.OS === "web") {
    switch (variant) {
      case "success":
        toast.success(title, options);
        break;
      case "error":
        toast.error(title, options);
        break;
      case "warning":
        toast.warning(title, options);
        break;
      default:
        toast.info(title, options);
        break;
    }
    return;
  }

  let toastId: string | number = 0;
  toastId = toast.custom(
    createElement(AppToast, {
      title,
      message,
      variant,
      onClose: () => toast.dismiss(toastId),
    }),
    { duration },
  );
}

/**
 * جایگزین Alert.alert با پشتیبانی RTL و ظاهر مدرن.
 */
export function notify(
  title: string,
  message?: string,
  buttons?: AlertButton[],
) {
  if (!buttons?.length) {
    showToast(title, message);
    return;
  }

  if (buttons.length === 1) {
    const [button] = buttons;
    showToast(title, message);
    button.onPress?.();
    return;
  }

  const cancelButton =
    buttons.find((button) => button.style === "cancel") ??
    buttons[buttons.length - 1];
  const actionButtons = buttons.filter((button) => button !== cancelButton);

  if (actionButtons.length > 1) {
    actionSheetHandler?.({
      title,
      message,
      buttons,
    });
    return;
  }

  const primaryAction = actionButtons[0] ?? cancelButton;

  confirmHandler?.({
    title,
    message,
    confirmLabel: primaryAction.text,
    cancelLabel: cancelButton.text,
    destructive: primaryAction.style === "destructive",
    onConfirm: primaryAction.onPress,
    onCancel: cancelButton.onPress,
  });
}

notify.success = (message: string, title = "موفق") =>
  showToast(title, message, "success");

notify.error = (message: string, title = "خطا") =>
  showToast(title, message, "error");

notify.warning = (message: string, title = "توجه") =>
  showToast(title, message, "warning");

notify.info = (message: string, title = "اطلاع") =>
  showToast(title, message, "info");
