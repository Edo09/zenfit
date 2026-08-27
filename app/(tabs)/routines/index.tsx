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
  SectionHeader,
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

// Headers and cards share one list so the group labels scroll with the
// content. `id` covers both so keyExtractor stays a one-liner.
type Row =
  | { kind: "header"; id: string; title: string }
  | { kind: "routine"; id: string; routine: Routine };

// The client's own routines + the AI plan generator + whatever the coach
// assigned from the admin panel. Assigned routines are read-only here: the
// coach owns them, and RLS rejects a client write either way.
export default function RoutinesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const { routines, assignedRoutines, myRoutines, loading, error, refreshing, refresh, deleteRoutine } =
    useRoutines();
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  useRefreshOnFocus(refresh);

  const hasAssigned = assignedRoutines.length > 0;

  // One flat list, but coach work and the client's own are kept in separate
  // labelled groups rather than interleaved — what the coach prescribed and
  // what the client made for themselves are different kinds of thing, and the
  // coach's is read-only. A SectionList would cost the shared RefreshControl
  // and itemLayoutAnimation, so headers ride in the same array as the cards.
  const rows = useMemo<Row[]>(() => {
    const card = (r: Routine): Row => ({ kind: "routine", id: r.id, routine: r });

    // A chip already names the single group it produced; a header repeating it
    // would be noise.
    if (filter !== "all") {
      // Coach-assigned is keyed off assigned_by, not source, so this filter and
      // the read-only treatment on each card always agree.
      if (filter === "coach") return assignedRoutines.map(card);
      return routines.filter((r) => r.source === filter).map(card);
    }

    // No coach: the screen title already reads "Mis Rutinas", so a second
    // header saying the same thing earns nothing.
    if (!hasAssigned) return myRoutines.map(card);

    const out: Row[] = [
      { kind: "header", id: "section-coach", title: t("coach.assignedRoutines") },
      ...assignedRoutines.map(card),
    ];
    if (myRoutines.length > 0) {
      out.push({ kind: "header", id: "section-own", title: t("routines.ownSection") });
      out.push(...myRoutines.map(card));
    }
    return out;
  }, [routines, assignedRoutines, myRoutines, hasAssigned, filter, t]);

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

  // Counts the client's OWN routines, matching the "Creadas por ti" group.
  // The coach's are counted separately rather than folded in or dropped: a
  // fully-coached client makes none of their own, and a bare "0 rutinas" above
  // a screen full of visible coach cards reads as a bug.
  const ownCount = t("routines.routineCount", { count: myRoutines.length });
  const subtitle = hasAssigned
    ? `${ownCount} · ${t("routines.assignedCount", { n: assignedRoutines.length })}`
    : ownCount;

  const header = (
    <HeaderPanel className="px-0">
      <DisplayText size={27}>{t("routines.myRoutines")}</DisplayText>
      <Text className="text-sm text-content-tertiary mt-1">{subtitle}</Text>
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
        data={rows}
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
          if (item.kind === "header") {
            return (
              <AnimatedView entering={staggered(index)}>
                <SectionHeader title={item.title} className="mt-2" />
              </AnimatedView>
            );
          }
          const routine = item.routine;
          const assigned = routine.assigned_by != null;
          return (
            <AnimatedView entering={staggered(index)} exiting={exit()}>
              <RoutineCard
                routine={routine}
                readOnly={assigned}
                onPress={() => router.push(`/(tabs)/routines/${routine.id}`)}
                onDelete={assigned ? undefined : () => setPendingDelete(routine)}
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
