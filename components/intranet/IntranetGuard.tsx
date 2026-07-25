"use client";

import { IntranetRoleBanner } from "@/components/intranet/IntranetRoleBanner";
import { useAuth } from "@/components/AuthProvider";
import {
  useEffectiveIntranetRole,
  useSuperAdminView,
} from "@/components/superadmin/SuperAdminViewProvider";
import {
  canAccessIntranetPath,
  hasIntranetPermission,
  isIntranetRole,
  type IntranetPermission,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";
import { tourAccountToIntranetRole } from "@/lib/auth/superAdminView";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type IntranetGuardProps = {
  allowedRoles?: IntranetRole[];
  permission?: IntranetPermission;
  children: React.ReactNode;
};

export function IntranetGuard({ allowedRoles, permission, children }: IntranetGuardProps) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const realRole = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  const bannerRole = useEffectiveIntranetRole() ?? realRole;
  const simulatedRole = isRealSuperAdmin ? tourAccountToIntranetRole(tourAccount) : null;
  const roleForAccess: IntranetRole | null = simulatedRole ?? realRole;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/intranet/acceso");
      return;
    }
    if (!realRole) {
      router.replace("/intranet/acceso");
      return;
    }

    if (!isRealSuperAdmin && allowedRoles && roleForAccess && !allowedRoles.includes(roleForAccess)) {
      router.replace("/intranet/acceso");
    }
  }, [allowedRoles, isRealSuperAdmin, loading, pathname, realRole, roleForAccess, router, user]);

  if (loading || !user || !realRole || !bannerRole) {
    return <div className="centerState">Cargando intranet…</div>;
  }

  const deniedByAllowed =
    Boolean(allowedRoles && roleForAccess && !allowedRoles.includes(roleForAccess));

  if (deniedByAllowed && !isRealSuperAdmin) {
    return (
      <>
        <IntranetRoleBanner role={bannerRole} />
        <main className="simplePage">
          <section className="formPageCard intranetNoticeCard">
            <h1>Sin permiso</h1>
            <p className="muted">Tu rol interno no puede acceder a esta sección.</p>
            <Link href="/intranet/acceso" className="secondaryButton wide">
              Volver
            </Link>
          </section>
        </main>
      </>
    );
  }

  if (isRealSuperAdmin && deniedByAllowed && tourAccount !== "super_admin") {
    return (
      <>
        <IntranetRoleBanner role={bannerRole} />
        <main className="simplePage">
          <section className="formPageCard intranetNoticeCard">
            <h1>Vista simulada: sin acceso</h1>
            <p className="muted">
              Estás paseando como esta cuenta. Usa el botón flotante para cambiar a Super
              administrador u otro perfil con acceso.
            </p>
          </section>
        </main>
      </>
    );
  }

  if (permission && roleForAccess && !hasIntranetPermission(roleForAccess, permission)) {
    return (
      <>
        <IntranetRoleBanner role={bannerRole} />
        <main className="simplePage">
          <section className="formPageCard intranetNoticeCard">
            <h1>Acción no permitida</h1>
            <p className="muted">
              {isRealSuperAdmin && tourAccount !== "super_admin"
                ? "En esta vista simulada no tienes ese permiso. Cambia de cuenta con el botón flotante."
                : "No tienes permisos para esta operación."}
            </p>
          </section>
        </main>
      </>
    );
  }

  if (roleForAccess && !canAccessIntranetPath(pathname, roleForAccess) && !isRealSuperAdmin) {
    return (
      <>
        <IntranetRoleBanner role={bannerRole} />
        <main className="simplePage">
          <section className="formPageCard intranetNoticeCard">
            <h1>Ruta restringida</h1>
            <p className="muted">Esta área está reservada para otro perfil interno.</p>
          </section>
        </main>
      </>
    );
  }

  if (
    isRealSuperAdmin &&
    roleForAccess &&
    !canAccessIntranetPath(pathname, roleForAccess) &&
    tourAccount !== "super_admin"
  ) {
    return (
      <>
        <IntranetRoleBanner role={bannerRole} />
        <main className="simplePage">
          <section className="formPageCard intranetNoticeCard">
            <h1>Vista simulada: ruta restringida</h1>
            <p className="muted">
              Con esta cuenta no podrías ver esta sección. Cambia de cuenta con el botón flotante.
            </p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <IntranetRoleBanner role={bannerRole} />
      {children}
    </>
  );
}
