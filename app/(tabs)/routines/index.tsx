import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl } from "react-native";

import { AIPlanCard } from "@/src/components/ai-plan-card";
import { EmptyState } from "@/src/components/empty-state";
import { RoutineCard } from "@/src/components/routine-card";
import {
  ConfirmDialog,
  ErrorState,
  FAB,
  LoadingBlock,
  useToast,
} from "@/src/components/ui";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { colors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import type { Routine } from "@/src/types/database";

export default function RoutinesScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { routines, loading, error, refreshing, refresh, deleteRoutine } = useRoutines();
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
      <FlatList
        data={routines}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brandPrimary}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={<AIPlanCard className="mb-1" />}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
            onDelete={() => setPendingDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title={t("routines.noRoutinesYet")}
            subtitle={t("routines.createFirstRoutine")}
            actionLabel={t("routines.createRoutine")}
            onAction={() => router.push("/(tabs)/routines/create")}
          />
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
