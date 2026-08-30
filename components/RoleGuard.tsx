"use client";

import { RoleModeBanner } from "@/components/RoleModeBanner";
import { useAuth } from "@/components/AuthProvider";
import {
  canAccessProfessionalFeatures,
  canPublishServiceRequest,
  getActiveMode,
  roleErrorMessage,
  type RoleMode,
  type UserRole,
} from "@/lib/auth/roles";
import { hasUnrestrictedSuperAdminAccess } from "@/lib/auth/superAdminAccess";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRoles?: UserRole[];
  requiredMode?: RoleMode;
  children: React.ReactNode;
  showRoleBanner?: boolean;
};

function hasRequiredAccess(
  profile: NonNullable<ReturnType<typeof useAuth>["profile"]>,
  email?: string | null,
  requiredMode?: RoleMode,
  allowedRoles?: UserRole[]
): boolean {
  if (hasUnrestrictedSuperAdminAccess(profile.intranet_role, email)) return true;
  if (profile.role === "admin") return true;

  if (requiredMode === "client") {
    return canPublishServiceRequest(profile);
  }

  if (requiredMode === "professional") {
    return canAccessProfessionalFeatures(profile);
  }

  if (allowedRoles?.length) {
    if (allowedRoles.includes("client") && allowedRoles.includes("professional")) {
      return canPublishServiceRequest(profile) || canAccessProfessionalFeatures(profile);
    }
    if (allowedRoles.includes("client")) {
      return canPublishServiceRequest(profile);
    }
    if (allowedRoles.includes("professional")) {
      return canAccessProfessionalFeatures(profile);
    }
  }

  return true;
}

export function RoleGuard({
  allowedRoles,
  requiredMode,
  children,
  showRoleBanner = true,
}: RoleGuardProps) {
  const { profile, loading, user } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const router = useRouter();
  const tourModeAllowed = isRealSuperAdmin && (
    (requiredMode === "professional" && tourAccount === "professional") ||
    (requiredMode === "client" && tourAccount === "client")
  );
  const accessAllowed = Boolean(
    profile && (tourModeAllowed || hasRequiredAccess(profile, user?.email, requiredMode, allowedRoles)),
  );

  useEffect(() => {
    if (loading || !profile?.role) return;

    if (!accessAllowed) {
      router.replace("/panel?error=sin-permiso");
    }
  }, [accessAllowed, loading, profile?.role, router]);

  if (loading) {
    return <div className="centerState">Cargando ZOVIT…</div>;
  }

  if (!profile?.role) {
    return null;
  }

  if (!accessAllowed) {
    return <div className="centerState">{roleErrorMessage("sin-permiso")}</div>;
  }

  const activeMode = getActiveMode(profile);

  return (
    <>
      {showRoleBanner && <RoleModeBanner role={activeMode} />}
      {children}
    </>
  );
}
