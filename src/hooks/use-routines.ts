import { useAuth } from "@/src/hooks/use-auth";
import type {
  Routine,
  RoutineExercise,
  RoutineExerciseInsert,
  RoutineInsert,
  RoutineWithExercises,
} from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useCallback, useEffect, useState } from "react";

export function useRoutines() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRoutines(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const createRoutine = async (data: RoutineInsert): Promise<Routine> => {
    const { data: routine, error } = await supabase
      .from("routines")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    setRoutines((prev) => [routine, ...prev]);
    return routine;
  };

  const deleteRoutine = async (id: string) => {
    const { error } = await supabase.from("routines").delete().eq("id", id);
    if (error) throw error;
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const getRoutineWithExercises = async (
    id: string,
  ): Promise<RoutineWithExercises | null> => {
    const { data, error } = await supabase
      .from("routines")
      .select("*, routine_exercises(*)")
      .eq("id", id)
      .order("sort_order", {
        referencedTable: "routine_exercises",
        ascending: true,
      })
      .single();
    if (error) throw error;
    return data as RoutineWithExercises;
  };

  const addExercise = async (
    data: RoutineExerciseInsert,
  ): Promise<RoutineExercise> => {
    const { data: exercise, error } = await supabase
      .from("routine_exercises")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return exercise;
  };

  const removeExercise = async (id: string) => {
    const { error } = await supabase
      .from("routine_exercises")
      .delete()
      .eq("id", id);
    if (error) throw error;
  };

  return {
    routines,
    loading,
    createRoutine,
    deleteRoutine,
    getRoutineWithExercises,
    addExercise,
    removeExercise,
    refresh: fetchRoutines,
  };
}
