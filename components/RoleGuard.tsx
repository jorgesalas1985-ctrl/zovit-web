"use client";

import { RoleModeBanner } from "@/components/RoleModeBanner";
import { useAuth } from "@/components/AuthProvider";
import { resolveRoleMode, roleErrorMessage, type UserRole } from "@/lib/auth/roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  showRoleBanner?: boolean;
};

export function RoleGuard({ allowedRoles, children, showRoleBanner = true }: RoleGuardProps) {
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

  const roleMode = showRoleBanner ? resolveRoleMode(allowedRoles, profile.role) : null;

  return (
    <>
      {roleMode && <RoleModeBanner role={roleMode} variant="page" />}
      {children}
    </>
  );
}
