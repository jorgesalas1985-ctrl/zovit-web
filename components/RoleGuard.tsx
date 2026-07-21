"use client";

import { useAuth } from "@/components/AuthProvider";
import { roleErrorMessage, type UserRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, profile, profileError, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (profileError === "perfil-incompleto" || !profile?.role) {
      void (async () => {
        await supabase.auth.signOut();
        router.replace("/login?error=perfil-incompleto");
      })();
      return;
    }

    if (!allowedRoles.includes(profile.role)) {
      router.replace("/panel?error=sin-permiso");
    }
  }, [allowedRoles, loading, profile, profileError, router, user]);

  if (loading) {
    return <div className="centerState">Cargando ZOVIT…</div>;
  }

  if (!user || profileError === "perfil-incompleto" || !profile?.role) {
    return <div className="centerState">{roleErrorMessage("perfil-incompleto")}</div>;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <div className="centerState">{roleErrorMessage("sin-permiso")}</div>;
  }

  return <>{children}</>;
}
