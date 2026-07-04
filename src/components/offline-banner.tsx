import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/src/components/ui";
import { useIsOnline } from "@/src/lib/online";
import { subscribeFlushResult, usePendingCount } from "@/src/lib/outbox";
import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";

// Global connectivity strip under the status bar: amber while offline (with
// the queued-change count), brand-colored while a reconnect flush is draining,
// hidden otherwise. Also surfaces flush outcomes as toasts.
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const pending = usePendingCount();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  useEffect(
    () =>
      subscribeFlushResult((result) => {
        if (result === "synced") {
          toast.show({ type: "success", message: t("common.syncedToast") });
        } else if (result === "dropped") {
          toast.show({ type: "error", message: t("common.syncFailedToast") });
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  if (online && pending === 0) return null;

  return (
    <View
      className={online ? "bg-info-soft" : "bg-warning-soft"}
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
  );
}
