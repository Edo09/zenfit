import { useAuth } from "@/src/hooks/use-auth";
import type { WorkoutLog, WorkoutLogInsert } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function useProgress() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setLogs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const todaysLogs = useMemo(
    () => logs.filter((l) => l.date === todayDateString()),
    [logs],
  );

  const createLog = async (data: WorkoutLogInsert): Promise<WorkoutLog> => {
    const { data: log, error } = await supabase
      .from("workout_logs")
      .insert({ ...data, date: data.date ?? todayDateString() })
      .select()
      .single();
    if (error) throw error;
    setLogs((prev) => [log, ...prev]);
    return log;
  };

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from("workout_logs").delete().eq("id", id);
    if (error) throw error;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  return {
    logs,
    loading,
    todaysLogs,
    createLog,
    deleteLog,
    refresh: fetchLogs,
  };
}
