import { useAuth } from "@/src/hooks/use-auth";
import type { WorkoutLog, WorkoutLogInsert } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function useProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: logs = [],
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WorkoutLog[];
    },
    enabled: !!user,
  });

  const todaysLogs = useMemo(
    () => logs.filter((l) => l.date === todayDateString()),
    [logs],
  );

  const createLogMutation = useMutation({
    mutationFn: async (data: WorkoutLogInsert) => {
      const { data: log, error } = await supabase
        .from("workout_logs")
        .insert({ ...data, date: data.date ?? todayDateString() })
        .select()
        .single();
      if (error) throw error;
      return log as WorkoutLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workout_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  return {
    logs,
    loading,
    todaysLogs,
    createLog: createLogMutation.mutateAsync,
    deleteLog: deleteLogMutation.mutateAsync,
    refresh: refetch,
  };
}
