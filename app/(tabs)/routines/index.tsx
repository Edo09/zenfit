import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, RefreshControl } from "react-native";
import RAnimated from "react-native-reanimated";

import { AIPlanCard } from "@/src/components/ai-plan-card";
import { EmptyState } from "@/src/components/empty-state";
import { RoutineCard } from "@/src/components/routine-card";
import {
  Chip,
  ConfirmDialog,
  DisplayText,
  ErrorState,
  FAB,
  HeaderPanel,
  LoadingBlock,
  useToast,
} from "@/src/components/ui";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { enterFade, exit, layout, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { Routine } from "@/src/types/database";

// Source, not modality: the data model has no strength/cardio field, so the
// filter row splits routines by where they came from instead.
type Filter = "all" | "coach" | "user" | "ai";

// The client's own routines + the AI plan generator + whatever the coach
// assigned from the admin panel. Assigned routines are read-only here: the
// coach owns them, and RLS rejects a client write either way.
export default function RoutinesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const { routines, assignedRoutines, loading, error, refreshing, refresh, deleteRoutine } =
    useRoutines();
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  useRefreshOnFocus(refresh);

  const hasAssigned = assignedRoutines.length > 0;

  const visible = useMemo(() => {
    // "All" pins the coach's work above the client's own — it's the thing they
    // were told to do today, and it can't be reordered any other way.
    if (filter === "all") {
      return [...routines].sort(
        (a, b) => Number(b.assigned_by != null) - Number(a.assigned_by != null),
      );
    }
    // Coach-assigned is keyed off assigned_by, not source, so this filter and
    // the read-only treatment on each card always agree.
    if (filter === "coach") return assignedRoutines;
    return routines.filter((r) => r.source === filter);
  }, [routines, assignedRoutines, filter]);

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

  // The coach chip only exists once there's something behind it — a self-serve
  // client with no coach shouldn't be shown a filter that's always empty.
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("routines.allFilter") },
    ...(hasAssigned ? [{ key: "coach" as const, label: t("coach.badge") }] : []),
    { key: "user", label: t("routines.mineFilter") },
    { key: "ai", label: t("routines.aiFilter") },
  ];

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
            <View className="flex-row gap-2">
              {filters.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={filter === f.key}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </View>
            <AIPlanCard />
          </AnimatedView>
        }
        renderItem={({ item, index }) => {
          const assigned = item.assigned_by != null;
          return (
            <AnimatedView entering={staggered(index)} exiting={exit()}>
              <RoutineCard
                routine={item}
                readOnly={assigned}
                onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
                onDelete={assigned ? undefined : () => setPendingDelete(item)}
              />
            </AnimatedView>
          );
        }}
        ListEmptyComponent={
          filter === "coach" ? (
            <EmptyState
              icon="award"
              title={t("coach.noAssignedRoutines")}
              subtitle={t("coach.noAssignedRoutinesHint")}
            />
          ) : routines.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              title={t("routines.noRoutinesYet")}
              subtitle={t("routines.createFirstRoutine")}
              actionLabel={t("routines.createRoutine")}
              onAction={() => router.push("/(tabs)/routines/create")}
            />
          ) : (
            <Text className="text-center text-content-tertiary py-10">
              {t("routines.noRoutinesForFilter")}
            </Text>
          )
        }
      />

      <FAB
        icon="plus"
        label={t("routines.newShort")}
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
