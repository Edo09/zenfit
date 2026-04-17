import { useAuth } from "@/src/hooks/use-auth";
import type {
  Routine,
  RoutineExercise,
  RoutineExerciseInsert,
  RoutineInsert,
  RoutineWithExercises,
} from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useRoutines() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: routines = [],
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["routines", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routines")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Routine[];
    },
    enabled: !!user,
  });

  const createRoutineMutation = useMutation({
    mutationFn: async (data: RoutineInsert) => {
      const { data: routine, error } = await supabase
        .from("routines")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return routine as Routine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });

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

  const addExerciseMutation = useMutation({
    mutationFn: async (data: RoutineExerciseInsert) => {
      const { data: exercise, error } = await supabase
        .from("routine_exercises")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return exercise as RoutineExercise;
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("routine_exercises")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  });

  return {
    routines,
    loading,
    createRoutine: createRoutineMutation.mutateAsync,
    deleteRoutine: deleteRoutineMutation.mutateAsync,
    getRoutineWithExercises,
    addExercise: addExerciseMutation.mutateAsync,
    removeExercise: removeExerciseMutation.mutateAsync,
    refresh: refetch,
  };
}
