import { useQuery } from "@tanstack/react-query";

import { qk } from "@/src/lib/query-keys";
import type { Exercise } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";

// Shared, coach-managed catalog (Admin Web Panel CRUDs it; RLS lets any
// authenticated user read it). Select shape must match the embed used in
// use-routines.ts's fetchRoutines so optimistic and server-fetched rows agree.
async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*, body_part:bodyparts(name)")
    .order("name");
  if (error) throw error;
  return data as Exercise[];
}

export function useExercises() {
  const { data: exercises = [], isPending: loading } = useQuery({
    queryKey: qk.exercises(),
    queryFn: fetchExercises,
  });
  return { exercises, loading };
}
