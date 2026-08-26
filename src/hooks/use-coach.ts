import { useQuery } from "@tanstack/react-query";

import { useMembership } from "@/src/hooks/use-membership";
import { useNutritionPlan } from "@/src/hooks/use-nutrition-plan";
import { useRoutines } from "@/src/hooks/use-routines";
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

/**
 * Does this client actually have a coach, or are they self-serve?
 *
 * The single-coach model means `useCoach()` resolves for EVERYONE — the coach
 * profile is world-readable — so it can't answer this on its own. What proves
 * a relationship is the coach having done something for them: a membership
 * row, an assigned routine, or an active nutrition plan. Every coaching
 * surface gates on this, so a self-serve user never sees an empty one.
 */
export function useHasCoach(): boolean {
  const { assignedRoutines } = useRoutines();
  const { membership } = useMembership();
  const { plan } = useNutritionPlan();
  return membership != null || assignedRoutines.length > 0 || plan != null;
}
