import { useAuth } from "@/src/hooks/use-auth";
import { enqueue } from "@/src/lib/outbox";
import { overlayRoutines } from "@/src/lib/outbox-overlay";
import { newId } from "@/src/lib/ids";
import { qk } from "@/src/lib/query-keys";
import type {
  AddRoutineExerciseInput,
  Exercise,
  Routine,
  RoutineExercise,
  RoutineInsert,
  RoutineWithExercises,
} from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

function exercisesById(list: Exercise[] | undefined): Map<string, Exercise> {
  return new Map((list ?? []).map((e) => [e.id, e]));
}

// Exercises ride along with the list so the routines tab (list + detail) is a
// single persisted query that works offline.
async function fetchRoutines(
  userId: string,
  catalog: Map<string, Exercise>,
): Promise<RoutineWithExercises[]> {
  // Explicit user filter on top of RLS: the coach role can read every
  // client's rows — without it a coach signing into the app would see all
  // clients' routines as their own.
  const { data, error } = await supabase
    .from("routines")
    .select("*, routine_exercises(*, exercise:exercises(*, body_part:bodyparts(name)))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("sort_order", {
      referencedTable: "routine_exercises",
      ascending: true,
    });
  if (error) throw error;
  return overlayRoutines(userId, data as RoutineWithExercises[], catalog);
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
    queryFn: () =>
      fetchRoutines(
        user!.id,
        exercisesById(queryClient.getQueryData<Exercise[]>(qk.exercises())),
      ),
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
    mutationFn: async (data: AddRoutineExerciseInput) => {
      const siblings =
        queryClient
          .getQueryData<RoutineWithExercises[]>(listKey)
          ?.find((r) => r.id === data.routine_id)?.routine_exercises ?? [];
      // Real table columns only — this is what actually gets sent to
      // Supabase. Embedding the joined `exercise` object here would make the
      // insert fail (PostgREST rejects payload keys the table doesn't have).
      const dbRow: Omit<RoutineExercise, "exercise"> = {
        id: newId(),
        routine_id: data.routine_id,
        user_id: user!.id,
        exercise_id: data.exercise_id,
        sets: data.sets ?? 3,
        reps: data.reps ?? 10,
        weight_kg: data.weight_kg ?? null,
        rest_seconds: data.rest_seconds ?? 60,
        sort_order: data.sort_order ?? siblings.length,
        notes: data.notes ?? null,
        created_at: new Date().toISOString(),
      };
      // What the UI actually renders — dbRow plus the picked catalog entry,
      // so the exercise shows its name/video immediately, pre-sync.
      const cacheRow: RoutineExercise = { ...dbRow, exercise: data.exercise };
      queryClient.setQueryData<RoutineWithExercises[]>(listKey, (old = []) =>
        old.map((r) =>
          r.id === cacheRow.routine_id
            ? { ...r, routine_exercises: [...r.routine_exercises, cacheRow] }
            : r,
        ),
      );
      await enqueue({
        userId: user!.id,
        table: "routine_exercises",
        kind: "insert",
        payload: dbRow,
      });
      return cacheRow;
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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.routines(user?.id),
    queryFn: () =>
      fetchRoutines(
        user!.id,
        exercisesById(queryClient.getQueryData<Exercise[]>(qk.exercises())),
      ),
    enabled: !!user && !!id,
    select: (all: RoutineWithExercises[]) =>
      all.find((r) => r.id === id) ?? null,
  });
}
