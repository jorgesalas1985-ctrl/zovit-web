"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  canAccessIntranetPath,
  hasIntranetPermission,
  isIntranetRole,
  type IntranetPermission,
  type IntranetRole,
} from "@/lib/auth/intranetRoles";
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
  const intranetRole = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/intranet/acceso");
      return;
    }
    if (!intranetRole) {
      router.replace("/intranet/acceso");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(intranetRole) && intranetRole !== "super_admin") {
      router.replace("/intranet/acceso");
    }
  }, [allowedRoles, intranetRole, loading, pathname, router, user]);

  if (loading || !user || !intranetRole) {
    return <div className="centerState">Cargando intranet…</div>;
  }

  if (allowedRoles && !allowedRoles.includes(intranetRole) && intranetRole !== "super_admin") {
    return (
      <main className="simplePage">
        <section className="formPageCard intranetNoticeCard">
          <h1>Sin permiso</h1>
          <p className="muted">Tu rol interno no puede acceder a esta sección.</p>
          <Link href="/intranet/acceso" className="secondaryButton wide">
            Volver
          </Link>
        </section>
      </main>
    );
  }

  if (permission && !hasIntranetPermission(intranetRole, permission)) {
    return (
      <main className="simplePage">
        <section className="formPageCard intranetNoticeCard">
          <h1>Acción no permitida</h1>
          <p className="muted">No tienes permisos para esta operación.</p>
        </section>
      </main>
    );
  }

  if (!canAccessIntranetPath(pathname, intranetRole)) {
    return (
      <main className="simplePage">
        <section className="formPageCard intranetNoticeCard">
          <h1>Ruta restringida</h1>
          <p className="muted">Esta área está reservada para otro perfil interno.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
