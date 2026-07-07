import { useQuery } from "@tanstack/react-query";

import { qk } from "@/src/lib/query-keys";
import type { Coach } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";

// Single-coach model: "my coach" is the one profile with role='coach'. RLS
// ("coach profile readable by clients") lets any client read this row.
async function fetchCoach(): Promise<Coach | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, whatsapp")
    .eq("role", "coach")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Coach | null) ?? null;
}

export function useCoach() {
  const { data: coach = null, isPending: loading } = useQuery({
    queryKey: qk.coach(),
    queryFn: fetchCoach,
  });
  return { coach, loading };
}
