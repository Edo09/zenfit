import { useAuth } from "@/src/hooks/use-auth";
import { enqueue } from "@/src/lib/outbox";
import { overlayLogs } from "@/src/lib/outbox-overlay";
import { newId } from "@/src/lib/ids";
import { qk } from "@/src/lib/query-keys";
import type { WorkoutLog, WorkoutLogInsert } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

async function fetchLogs(userId: string): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return overlayLogs(userId, data as WorkoutLog[]);
}

export function useProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listKey = qk.progress(user?.id);

  const {
    data: logs = [],
    isPending: loading,
    isError: error,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => fetchLogs(user!.id),
    enabled: !!user,
  });

  const todaysLogs = useMemo(
    () => logs.filter((l) => l.date === todayDateString()),
    [logs],
  );

  const createLogMutation = useMutation({
    mutationFn: async (data: WorkoutLogInsert) => {
      const log: WorkoutLog = {
        id: newId(),
        user_id: user!.id,
        routine_id: data.routine_id ?? null,
        routine_name: data.routine_name,
        date: data.date ?? todayDateString(),
        duration_minutes: data.duration_minutes ?? null,
        notes: data.notes ?? null,
        completed_exercises: data.completed_exercises ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<WorkoutLog[]>(listKey, (old = []) =>
        [log, ...old].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.created_at.localeCompare(a.created_at),
        ),
      );
      await enqueue({
        userId: user!.id,
        table: "workout_logs",
        kind: "insert",
        payload: log,
      });
      return log;
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      queryClient.setQueryData<WorkoutLog[]>(listKey, (old = []) =>
        old.filter((l) => l.id !== id),
      );
      await enqueue({
        userId: user!.id,
        table: "workout_logs",
        kind: "delete",
        payload: { id },
      });
    },
  });

  return {
    logs,
    loading,
    error,
    refreshing,
    todaysLogs,
    createLog: createLogMutation.mutateAsync,
    deleteLog: deleteLogMutation.mutateAsync,
    refresh: refetch,
  };
}
