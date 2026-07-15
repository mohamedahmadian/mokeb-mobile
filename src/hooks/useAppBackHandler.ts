import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * هندلر دکمه Back — در صورت مدیریت رویداد `true` برگردانید.
 * آخرین هندلر ثبت‌شده اولویت دارد (مثلاً مودال روی فرم).
 */
export type AppBackHandler = () => boolean;

const handlers: AppBackHandler[] = [];

export function registerAppBackHandler(handler: AppBackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

/** اجرای هندلرهای ثبت‌شده از آخر به اول؛ اولین `true` متوقف می‌کند. */
export function runAppBackHandlers(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    try {
      if (handlers[i]?.()) return true;
    } catch {
      // نادیده؛ هندلر بعدی را امتحان کن
    }
  }
  return false;
}

/**
 * ثبت هندلر Back فقط وقتی صفحه فوکوس دارد
 * (برای جلوگیری از تداخل تب‌های mount‌شده در پس‌زمینه).
 */
export function useFocusedBackHandler(
  handler: AppBackHandler | null | undefined,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useFocusEffect(
    useCallback(() => {
      if (!handlerRef.current) return;
      const wrapped: AppBackHandler = () => handlerRef.current?.() ?? false;
      return registerAppBackHandler(wrapped);
    }, [handler != null]),
  );
}

/** ثبت هندلر بدون وابستگی به فوکوس (برای مودال‌های سراسری) */
export function useAppBackHandler(
  handler: AppBackHandler | null | undefined,
  enabled = true,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !handler) return;
    const wrapped: AppBackHandler = () => handlerRef.current?.() ?? false;
    return registerAppBackHandler(wrapped);
  }, [enabled, handler != null]);
}
