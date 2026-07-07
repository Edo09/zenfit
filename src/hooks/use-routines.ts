import { useAuth } from "@/src/hooks/use-auth";
import { enqueue } from "@/src/lib/outbox";
import { overlayRoutines } from "@/src/lib/outbox-overlay";
import { newId } from "@/src/lib/ids";
import { qk } from "@/src/lib/query-keys";
import type {
  Routine,
  RoutineExercise,
  RoutineExerciseInsert,
  RoutineInsert,
  RoutineWithExercises,
} from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// Exercises ride along with the list so the routines tab (list + detail) is a
// single persisted query that works offline.
async function fetchRoutines(userId: string): Promise<RoutineWithExercises[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("*, routine_exercises(*)")
    .order("created_at", { ascending: false })
    .order("sort_order", {
      referencedTable: "routine_exercises",
      ascending: true,
    });
  if (error) throw error;
  return overlayRoutines(userId, data as RoutineWithExercises[]);
}

export function useRoutines() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listKey = qk.routines(user?.id);

  const {
    data: routines = [],
    isPending: loading,
    isError: error,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => fetchRoutines(user!.id),
    enabled: !!user,
  });

  // Split by provenance: coach-assigned (read-only) vs the client's own.
  const assignedRoutines = useMemo(
    () => routines.filter((r) => r.assigned_by != null),
    [routines],
  );
  const myRoutines = useMemo(
    () => routines.filter((r) => r.assigned_by == null),
    [routines],
  );

  const createRoutineMutation = useMutation({
    mutationFn: async (data: RoutineInsert) => {
      const now = new Date().toISOString();
      const routine: Routine = {
        id: newId(),
        user_id: user!.id,
        name: data.name,
        description: data.description ?? null,
        day_of_week: data.day_of_week ?? null,
        assigned_by: null,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<RoutineWithExercises[]>(listKey, (old = []) => [
        { ...routine, routine_exercises: [] },
        ...old,
      ]);
      await enqueue({
        userId: user!.id,
        table: "routines",
        kind: "insert",
        payload: routine,
      });
      return routine;
    },
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (id: string) => {
      queryClient.setQueryData<RoutineWithExercises[]>(listKey, (old = []) =>
        old.filter((r) => r.id !== id),
      );
      await enqueue({
        userId: user!.id,
        table: "routines",
        kind: "delete",
        payload: { id },
      });
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (data: RoutineExerciseInsert) => {
      const siblings =
        queryClient
          .getQueryData<RoutineWithExercises[]>(listKey)
          ?.find((r) => r.id === data.routine_id)?.routine_exercises ?? [];
      const exercise: RoutineExercise = {
        id: newId(),
        routine_id: data.routine_id,
        user_id: user!.id,
        name: data.name,
        sets: data.sets ?? 3,
        reps: data.reps ?? 10,
        weight_kg: data.weight_kg ?? null,
        rest_seconds: data.rest_seconds ?? 60,
        sort_order: data.sort_order ?? siblings.length,
        notes: data.notes ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<RoutineWithExercises[]>(listKey, (old = []) =>
        old.map((r) =>
          r.id === exercise.routine_id
            ? { ...r, routine_exercises: [...r.routine_exercises, exercise] }
            : r,
        ),
      );
      await enqueue({
        userId: user!.id,
        table: "routine_exercises",
        kind: "insert",
        payload: exercise,
      });
      return exercise;
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      queryClient.setQueryData<RoutineWithExercises[]>(listKey, (old = []) =>
        old.map((r) => ({
          ...r,
          routine_exercises: r.routine_exercises.filter((ex) => ex.id !== id),
        })),
      );
      await enqueue({
        userId: user!.id,
        table: "routine_exercises",
        kind: "delete",
        payload: { id },
      });
    },
  });

  return {
    routines,
    assignedRoutines,
    myRoutines,
    loading,
    error,
    refreshing,
    createRoutine: createRoutineMutation.mutateAsync,
    deleteRoutine: deleteRoutineMutation.mutateAsync,
    addExercise: addExerciseMutation.mutateAsync,
    removeExercise: removeExerciseMutation.mutateAsync,
    refresh: refetch,
  };
}

// Detail view derived from the (persisted) list cache — renders offline.
export function useRoutineDetail(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.routines(user?.id),
    queryFn: () => fetchRoutines(user!.id),
    enabled: !!user && !!id,
    select: (all: RoutineWithExercises[]) =>
      all.find((r) => r.id === id) ?? null,
  });
}
