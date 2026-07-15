import { useCallback, useRef, useState } from "react";
import { RefreshControl } from "react-native";
import { colors } from "@/src/lib/theme";

/**
 * Pull-to-refresh برای یک تابع async (معمولاً refetch یک یا چند query).
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchRef.current();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}

type AppRefreshControlProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

export function AppRefreshControl({
  refreshing,
  onRefresh,
}: AppRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
      progressBackgroundColor={colors.surface}
    />
  );
}
