import React from "react";
import { AuthContext } from "@/src/providers/auth-provider";
import { supabase } from "@/src/utils/supabase";

export function useAuth() {
  const context = React.use(AuthContext);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    ...context,
    signIn,
    signUp,
    signOut,
  };
}
