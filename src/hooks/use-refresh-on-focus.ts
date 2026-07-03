import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Refetches a query whenever the screen regains navigation focus
 * (e.g. switching back to a tab). Skips the initial mount — useQuery
 * already fetches then.
 */
export function useRefreshOnFocus(refetch: () => void) {
  const firstTime = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTime.current) {
        firstTime.current = false;
        return;
      }
      refetch();
    }, [refetch])
  );
}
