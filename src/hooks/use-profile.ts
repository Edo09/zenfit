import { Profile } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: profile = null, isPending: loading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  return { profile, loading, updateProfile: updateProfileMutation.mutateAsync };
}
