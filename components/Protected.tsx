"use client";

import { useAuth } from "@/components/AuthProvider";
import { roleErrorMessage } from "@/lib/auth/roles";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError, profileLoading, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const signingOut = useRef(false);
  const retriedProfile = useRef(false);

  const profilePending = !!user && (profileLoading || (!profile?.role && profileError !== "perfil-incompleto"));

  useEffect(() => {
    if (loading || profilePending) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (profileError === "perfil-incompleto" || !profile?.role) {
      if (signingOut.current) return;

      if (!retriedProfile.current) {
        retriedProfile.current = true;
        void refreshProfile();
        return;
      }

      signingOut.current = true;
      void (async () => {
        await signOut();
        router.replace("/login?error=perfil-incompleto");
      })();
    }
  }, [loading, profile, profileError, profilePending, refreshProfile, router, signOut, user]);

  if (loading || profilePending) {
    return <div className="centerState">Cargando ZOVIT…</div>;
  }

  if (!user) return null;

  if (profileError === "perfil-incompleto" || !profile?.role) {
    return <div className="centerState">{roleErrorMessage("perfil-incompleto")}</div>;
  }

  return <>{children}</>;
}
