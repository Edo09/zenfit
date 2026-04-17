import { supabase } from "@/src/utils/supabase";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useEffect, useState } from "react";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  setOnboardingCompleted: (value: boolean) => void;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  onboardingCompleted: null,
  setOnboardingCompleted: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const fetchOnboardingStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .single();
    if (error) {
    } else {
    }
    setOnboardingCompleted(data?.onboarding_completed ?? false);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchOnboardingStatus(session.user.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.error("[Auth] Error getting session:", error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchOnboardingStatus(session.user.id);
      } else {
        setOnboardingCompleted(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext value={{
      session,
      user: session?.user ?? null,
      loading,
      onboardingCompleted,
      setOnboardingCompleted,
    }}>
      {children}
    </AuthContext>
  );
}
