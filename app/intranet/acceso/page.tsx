"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  intranetHomeForRole,
  isIntranetRole,
  portalMatchesRole,
  type IntranetPortal,
} from "@/lib/auth/intranetRoles";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function IntranetAccessContent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = (searchParams.get("portal") ?? "trabajadores") as IntranetPortal;

  const intranetRole = isIntranetRole(profile?.intranet_role)
    ? profile.intranet_role
    : null;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/intranet/acceso?portal=${portal}`)}`);
      return;
    }

    if (!intranetRole) {
      return;
    }

    if (portalMatchesRole(portal, intranetRole)) {
      router.replace(intranetHomeForRole(intranetRole));
      return;
    }

    router.replace(intranetHomeForRole(intranetRole));
  }, [intranetRole, loading, portal, router, user]);

  if (loading) {
    return <div className="centerState">Validando acceso interno…</div>;
  }

  if (!user) {
    return <div className="centerState">Redirigiendo al inicio de sesión…</div>;
  }

  if (!intranetRole) {
    return (
      <main className="simplePage">
        <section className="formPageCard intranetNoticeCard">
          <p className="kicker">INTRANET ZOVIT</p>
          <h1>Sin acceso interno activo</h1>
          <p className="muted">
            Tu cuenta pública existe, pero aún no tienes rol interno asignado para{" "}
            <strong>{portal}</strong>. Recursos Humanos debe habilitarte en Supabase.
          </p>
          <Link href="/" className="secondaryButton wide">
            Volver al inicio público
          </Link>
        </section>
      </main>
    );
  }

  return <div className="centerState">Redirigiendo a tu panel interno…</div>;
}

export default function IntranetAccessPage() {
  return (
    <Suspense fallback={<div className="centerState">Cargando intranet…</div>}>
      <IntranetAccessContent />
    </Suspense>
  );
}
