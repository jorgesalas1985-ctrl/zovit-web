"use client";

import { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";

export type UserProfile = {
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  intranet_role: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  profileError: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name,last_name,role,intranet_role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data || !isUserRole(data.role)) {
      setProfile(null);
      setProfileError("perfil-incompleto");
      return;
    }

    setProfile({
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      intranet_role: data.intranet_role ?? null,
    });
    setProfileError(null);
  }

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    await loadProfile(user.id);
  }, []);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      setLoading(true);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (currentUser) {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        await loadProfile(currentUser.id);
      } else {
        setSession(null);
        setProfile(null);
        setProfileError(null);
      }

      if (active) setLoading(false);
    }

    void initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setLoading(true);
      setSession(nextSession);

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setProfileError(null);
      }

      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setProfileError(null);
      },
      refreshProfile,
    }),
    [session, profile, profileError, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
