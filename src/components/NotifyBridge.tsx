import { useEffect } from "react";
import { registerNotifyHandlers } from "@/src/lib/notify";
import { useNotifyContext } from "@/src/contexts/NotifyContext";

export function NotifyBridge() {
  const { showConfirm, showActions } = useNotifyContext();

  useEffect(() => {
    registerNotifyHandlers({
      confirm: showConfirm,
      actions: showActions,
    });
  }, [showConfirm, showActions]);

  return null;
}
