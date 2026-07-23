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
  identity_status: "none" | "pending" | "approved" | "rejected";
  identity_verified: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  profileError: string | null;
  profileLoading: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PROFILE_SELECT =
  "first_name,last_name,role,intranet_role,identity_status,identity_verified" as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);

    let lastError: { code?: string; message?: string } | null = null;
    let lastData: Record<string, unknown> | null = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) {
        await sleep(250 * attempt);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        lastError = error;
        continue;
      }

      lastData = data;
      lastError = null;
      break;
    }

    if (lastError) {
      setProfile(null);
      setProfileError("perfil-incompleto");
      setProfileLoading(false);
      return;
    }

    if (!lastData || !isUserRole(lastData.role as string | null | undefined)) {
      setProfile(null);
      setProfileError("perfil-incompleto");
      setProfileLoading(false);
      return;
    }

    setProfile({
      first_name: (lastData.first_name as string | null) ?? null,
      last_name: (lastData.last_name as string | null) ?? null,
      role: lastData.role as UserRole,
      intranet_role: (lastData.intranet_role as string | null) ?? null,
      identity_status: (lastData.identity_status as UserProfile["identity_status"]) ?? "none",
      identity_verified: (lastData.identity_verified as boolean) ?? false,
    });
    setProfileError(null);
    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    await loadProfile(user.id);
  }, [loadProfile]);

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
        setProfileLoading(false);
      }

      if (active) setLoading(false);
    }

    void initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      setSession(nextSession);

      if (nextSession?.user) {
        // Defer profile fetch so the client JWT is ready for RLS queries.
        window.setTimeout(() => {
          void loadProfile(nextSession.user.id).finally(() => {
            setLoading(false);
          });
        }, 0);
        return;
      }

      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      profileLoading,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
      },
      refreshProfile,
    }),
    [session, profile, profileError, profileLoading, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
