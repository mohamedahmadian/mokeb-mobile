import { useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";

export const TAB_REFRESH_PARAM = "tabRefresh";

type TabRefreshOptions = {
  onReset?: () => void;
  onRefresh?: () => void | Promise<void>;
};

export function useTabRefresh({ onReset, onRefresh }: TabRefreshOptions) {
  const params = useLocalSearchParams<{ [TAB_REFRESH_PARAM]?: string }>();
  const tabRefresh = params[TAB_REFRESH_PARAM];
  const handledResetRef = useRef<string | null>(null);
  const handledRefreshRef = useRef<string | null>(null);
  const onResetRef = useRef(onReset);
  const onRefreshRef = useRef(onRefresh);
  onResetRef.current = onReset;
  onRefreshRef.current = onRefresh;

  if (tabRefresh && handledResetRef.current !== tabRefresh) {
    handledResetRef.current = tabRefresh;
    onResetRef.current?.();
  }

  useEffect(() => {
    if (!tabRefresh || handledRefreshRef.current === tabRefresh) return;
    handledRefreshRef.current = tabRefresh;
    void onRefreshRef.current?.();
  }, [tabRefresh]);
}
