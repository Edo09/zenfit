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
  DisplayText,
  ErrorState,
  FAB,
  HeaderPanel,
  LoadingBlock,
  SegmentedControl,
  useToast,
} from "@/src/components/ui";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { enterFade, exit, layout, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { Routine } from "@/src/types/database";

// Provenance, not modality: the data model has no strength/cardio field. What
// the coach prescribed and what the client made for themselves are different
// kinds of thing — the coach's is read-only, and the client can't add to it —
// so they get a tab each rather than one list with filters. AI-generated plans
// are the client's own and live under "Mías", where their badge tells them
// apart.
type Tab = "coach" | "mine";

export default function RoutinesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const { routines, assignedRoutines, myRoutines, loading, error, refreshing, refresh, deleteRoutine } =
    useRoutines();
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);
  useRefreshOnFocus(refresh);

  const hasAssigned = assignedRoutines.length > 0;

  // Seeded from what exists, then the client's choice wins — a refetch must not
  // yank the tab out from under them. Clamped to "mine" when the coach has
  // nothing assigned, so archiving the last one can't strand an empty tab.
  const [tab, setTab] = useState<Tab | null>(null);
  const activeTab: Tab = hasAssigned ? (tab ?? "coach") : "mine";
  const onCoachTab = activeTab === "coach";

  const visible = onCoachTab ? assignedRoutines : myRoutines;

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

  // Total across both tabs; the per-group numbers ride on the tab badges, so
  // repeating the split here would say the same thing twice.
  const header = (
    <HeaderPanel className="px-0">
      <DisplayText size={27}>{t("routines.myRoutines")}</DisplayText>
      <Text className="text-sm text-content-tertiary mt-1">
        {t("routines.routineCount", { count: routines.length })}
      </Text>
    </HeaderPanel>
  );

  if (loading && routines.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark px-5">
        {header}
        <LoadingBlock />
      </View>
    );
  }

  if (error && routines.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark px-5">
        {header}
        <ErrorState onRetry={refresh} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-dark">
      <RAnimated.FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 160 }}
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
          <AnimatedView entering={enterFade()} className="gap-4 mb-1">
            {header}
            {/* The tabs only exist once there are two groups — a self-serve
                client with no coach shouldn't be shown a tab that's always
                empty, and their list is then just "their routines". */}
            {hasAssigned && (
              <SegmentedControl
                segments={[
                  {
                    key: "coach",
                    label: t("coach.badge"),
                    count: assignedRoutines.length,
                  },
                  {
                    key: "mine",
                    label: t("routines.mineFilter"),
                    count: myRoutines.length,
                  },
                ]}
                value={activeTab}
                onChange={(k) => setTab(k as Tab)}
              />
            )}
            {/* Generating a plan belongs to the client's own routines; under
                the coach's prescription it would just be noise. */}
            {!onCoachTab && <AIPlanCard />}
          </AnimatedView>
        }
        renderItem={({ item, index }) => (
          <AnimatedView entering={staggered(index)} exiting={exit()}>
            <RoutineCard
              routine={item}
              readOnly={onCoachTab}
              onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
              onDelete={onCoachTab ? undefined : () => setPendingDelete(item)}
            />
          </AnimatedView>
        )}
        ListEmptyComponent={
          onCoachTab ? (
            <EmptyState
              icon="award"
              title={t("coach.noAssignedRoutines")}
              subtitle={t("coach.noAssignedRoutinesHint")}
            />
          ) : (
            <EmptyState
              icon="dumbbell"
              title={t("routines.noOwnRoutinesYet")}
              subtitle={t("routines.createFirstRoutine")}
              actionLabel={t("routines.createRoutine")}
              onAction={() => router.push("/(tabs)/routines/create")}
            />
          )
        }
      />

      {/* Creating only ever lands in the client's own routines, so the button
          is hidden on the coach tab rather than silently switching tabs. */}
      {!onCoachTab && (
        <FAB
          icon="plus"
          label={t("routines.newShort")}
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
