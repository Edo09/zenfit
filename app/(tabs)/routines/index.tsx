import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, RefreshControl } from "react-native";
import RAnimated from "react-native-reanimated";

import { AIPlanCard } from "@/src/components/ai-plan-card";
import { EmptyState } from "@/src/components/empty-state";
import { RoutineCard } from "@/src/components/routine-card";
import {
  ConfirmDialog,
  ErrorState,
  FAB,
  LoadingBlock,
  SectionHeader,
  useToast,
} from "@/src/components/ui";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { enterFade, exit, layout, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { Routine } from "@/src/types/database";

export default function RoutinesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const { routines, assignedRoutines, myRoutines, loading, error, refreshing, refresh, deleteRoutine } =
    useRoutines();
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);
  useRefreshOnFocus(refresh);

  const handleConfirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target == null) return;
    try {
      await deleteRoutine(target.id);
      toast.show({ type: "success", message: t("routines.routineDeleted") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  if (loading && routines.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  if (error && routines.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <ErrorState onRetry={refresh} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-dark">
      <RAnimated.FlatList
        data={myRoutines}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        // Siblings slide up to close the gap on delete (unreliable on web)
        itemLayoutAnimation={Platform.OS !== "web" ? layout() : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brandPrimary}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <AnimatedView entering={enterFade()} className="gap-3">
            <AIPlanCard className="mb-1" />
            {assignedRoutines.length > 0 && (
              <View className="gap-3">
                <SectionHeader title={t("coach.assignedRoutines")} />
                {assignedRoutines.map((item, index) => (
                  <AnimatedView key={item.id} entering={staggered(index)}>
                    <RoutineCard
                      routine={item}
                      readOnly
                      onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
                    />
                  </AnimatedView>
                ))}
                {myRoutines.length > 0 && (
                  <SectionHeader title={t("routines.myRoutines")} className="mt-1" />
                )}
              </View>
            )}
          </AnimatedView>
        }
        renderItem={({ item, index }) => (
          <AnimatedView entering={staggered(index)} exiting={exit()}>
            <RoutineCard
              routine={item}
              onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
              onDelete={() => setPendingDelete(item)}
            />
          </AnimatedView>
        )}
        ListEmptyComponent={
          assignedRoutines.length > 0 ? (
            // Has coach plans but none of their own yet — gentle nudge, not a full empty screen.
            <EmptyState
              icon="add-circle-outline"
              title={t("routines.noOwnRoutinesYet")}
              subtitle={t("routines.createFirstRoutine")}
              actionLabel={t("routines.createRoutine")}
              onAction={() => router.push("/(tabs)/routines/create")}
            />
          ) : (
            <EmptyState
              icon="barbell-outline"
              title={t("routines.noRoutinesYet")}
              subtitle={t("routines.createFirstRoutine")}
              actionLabel={t("routines.createRoutine")}
              onAction={() => router.push("/(tabs)/routines/create")}
            />
          )
        }
      />

      <FAB
        onPress={() => router.push("/(tabs)/routines/create")}
        accessibilityLabel={t("routines.createRoutine")}
      />

      <ConfirmDialog
        visible={pendingDelete != null}
        destructive
        title={t("routines.deleteRoutine")}
        message={pendingDelete != null ? t("routines.deleteConfirm", { name: pendingDelete.name }) : undefined}
        confirmLabel={t("common.delete")}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </View>
  );
}
