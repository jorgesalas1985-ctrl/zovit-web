"use client";

import { useAuth } from "@/components/AuthProvider";
import { roleErrorMessage, type UserRole } from "@/lib/auth/roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !profile?.role) return;

    if (!allowedRoles.includes(profile.role)) {
      router.replace("/panel?error=sin-permiso");
    }
  }, [allowedRoles, loading, profile, router]);

  if (loading) {
    return <div className="centerState">Cargando ZOVIT…</div>;
  }

  if (!profile?.role) {
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <div className="centerState">{roleErrorMessage("sin-permiso")}</div>;
  }

  return <>{children}</>;
}
