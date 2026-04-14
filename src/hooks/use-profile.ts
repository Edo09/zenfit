import { Profile } from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useEffect, useState } from "react";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();

      if (!cancelled) {
        if (!error && data) setProfile(data as Profile);
        setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return { profile, loading, updateProfile };
}
