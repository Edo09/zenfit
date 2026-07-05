import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/src/components/ui";
import { DUR, EASE_IN, EASE_OUT } from "@/src/lib/motion";
import { useIsOnline } from "@/src/lib/online";
import { subscribeFlushResult, usePendingCount } from "@/src/lib/outbox";
import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";

// Global connectivity strip under the status bar: amber while offline (with
// the queued-change count), brand-colored while a reconnect flush is draining,
// hidden otherwise. Also surfaces flush outcomes as toasts.
//
// Always mounted: the strip animates its real (measured) height so the
// content below reflows smoothly instead of jumping.
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const pending = usePendingCount();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const visible = !(online && pending === 0);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(0);

  // Successful syncs are silent — the banner disappearing is signal enough.
  // Only surface drops, where queued changes were lost.
  useEffect(
    () =>
      subscribeFlushResult((result) => {
        if (result === "dropped") {
          toast.show({ type: "error", message: t("common.syncFailedToast") });
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: DUR.base,
      easing: visible ? EASE_OUT : EASE_IN,
    });
  }, [visible, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    // Unclamped on the first frame so onLayout can measure the content
    height: contentHeight === 0 ? undefined : progress.value * contentHeight,
    opacity: progress.value,
  }));

  return (
    <AnimatedView
      className={online ? "bg-info-soft" : "bg-warning-soft"}
      style={[{ overflow: "hidden" }, containerStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-center gap-2 px-4 py-1.5">
          <Ionicons
            name={online ? "sync-outline" : "cloud-offline-outline"}
            size={14}
            color={online ? colors.brandPrimary : colors.warning}
          />
          <Text
            className={`text-xs font-medium ${online ? "text-brand-primary" : "text-warning"}`}
          >
            {online
              ? t("common.syncing")
              : pending > 0
                ? `${t("common.offlineBanner")} · ${t("common.pendingChanges", { count: pending })}`
                : t("common.offlineBanner")}
          </Text>
        </View>
      </View>
    </AnimatedView>
  );
}
