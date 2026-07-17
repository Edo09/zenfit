import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, RefreshControl } from "react-native";
import RAnimated from "react-native-reanimated";

import { AIPlanCard } from "@/src/components/ai-plan-card";
import { EmptyState } from "@/src/components/empty-state";
import { ProgramView } from "@/src/components/program/program-view";
import { RoutineCard } from "@/src/components/routine-card";
import {
  ConfirmDialog,
  ErrorState,
  FAB,
  LoadingBlock,
  Screen,
  SegmentedControl,
  useToast,
} from "@/src/components/ui";
import { useProgram } from "@/src/hooks/use-program";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { enterFade, exit, layout, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { Routine } from "@/src/types/database";

type Tab = "coach" | "mine";

export default function RoutinesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const { assignedRoutines, myRoutines, routines, loading, error, refreshing, refresh, deleteRoutine } =
    useRoutines();
  const {
    program,
    week,
    selectedWeek,
    autoWeek,
    setViewWeek,
    notStarted,
    refresh: refreshProgram,
    refreshing: programRefreshing,
  } = useProgram();
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);
  useRefreshOnFocus(refresh);

  // The Coach tab now holds a multi-week program (when assigned) plus any
  // legacy flat assigned routines. Count reflects both.
  const coachCount = (program != null ? 1 : 0) + assignedRoutines.length;

  // Default to whichever tab has content — coach plans lead when present,
  // otherwise the client's own. Derived (not effect-driven) so there's no
  // flash; a manual choice pins it.
  const [manualTab, setManualTab] = useState<Tab | null>(null);
  const tab: Tab = manualTab ?? (coachCount > 0 ? "coach" : "mine");

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

  const isCoachTab = tab === "coach";
  const data = isCoachTab ? assignedRoutines : myRoutines;

  return (
    <View className="flex-1 bg-brand-dark">
      <View className="px-4 pt-3 pb-1">
        <SegmentedControl
          value={tab}
          onChange={(k) => setManualTab(k as Tab)}
          segments={[
            {
              key: "coach",
              label: t("coach.assignedRoutines"),
              count: coachCount,
            },
            {
              key: "mine",
              label: t("routines.myRoutines"),
              count: myRoutines.length,
            },
          ]}
        />
      </View>

      {isCoachTab && program != null ? (
        // A multi-week program renders as a scroll of cards (week navigator +
        // days), with any legacy flat assigned routines listed beneath it.
        <Screen
          refreshing={programRefreshing}
          onRefresh={refreshProgram}
          contentContainerClassName="p-4 gap-3 pb-24"
        >
          <ProgramView
            program={program}
            week={week}
            selectedWeek={selectedWeek}
            autoWeek={autoWeek}
            onSelectWeek={setViewWeek}
            notStarted={notStarted}
          />
          {assignedRoutines.map((item) => (
            <RoutineCard
              key={item.id}
              routine={item}
              readOnly
              onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
            />
          ))}
        </Screen>
      ) : (
        <RAnimated.FlatList
          // Remount on tab switch so the list resets scroll and replays entrances.
          key={tab}
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
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
            // AI generator seeds the client's own plans — only on the "mine" tab.
            isCoachTab ? null : (
              <AnimatedView entering={enterFade()} className="mb-1">
                <AIPlanCard />
              </AnimatedView>
            )
          }
          renderItem={({ item, index }) => (
            <AnimatedView entering={staggered(index)} exiting={exit()}>
              <RoutineCard
                routine={item}
                readOnly={isCoachTab}
                onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
                onDelete={isCoachTab ? undefined : () => setPendingDelete(item)}
              />
            </AnimatedView>
          )}
          ListEmptyComponent={
            isCoachTab ? (
              <EmptyState
                icon="ribbon-outline"
                title={t("coach.noAssignedRoutines")}
                subtitle={t("coach.noAssignedRoutinesHint")}
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
      )}

      {/* Create is a "my own" action — hidden on the coach tab. */}
      {!isCoachTab && (
        <FAB
          onPress={() => router.push("/(tabs)/routines/create")}
          accessibilityLabel={t("routines.createRoutine")}
        />
      )}

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
