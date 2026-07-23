"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { PlatformUsersManager } from "@/components/intranet/PlatformUsersManager";
import Link from "next/link";

export default function PlatformUsersAdminPage() {
  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]} permission="manage_intranet_users">
      <IntranetShell
        title="Gestión de usuarios ZOVIT"
        description="Administra clientes, profesionales e intranet. Modifica datos, verifica biometría y elimina cuentas. El super administrador no puede eliminarse."
        kicker="USUARIOS PLATAFORMA"
      >
        <PlatformUsersManager />

        <Link href="/intranet/admin" className="secondaryButton wide">
          Volver a administración
        </Link>
      </IntranetShell>
    </IntranetGuard>
  );
}
