"use client";

import { useAuth } from "@/components/AuthProvider";
import { roleErrorMessage } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (profileError === "perfil-incompleto" || (user && !profile?.role)) {
      void (async () => {
        await supabase.auth.signOut();
        router.replace("/login?error=perfil-incompleto");
      })();
    }
  }, [loading, profile, profileError, router, user]);

  if (loading) return <div className="centerState">Cargando ZOVIT…</div>;
  if (!user) return null;

  if (profileError === "perfil-incompleto" || !profile?.role) {
    return <div className="centerState">{roleErrorMessage("perfil-incompleto")}</div>;
  }

  return <>{children}</>;
}
