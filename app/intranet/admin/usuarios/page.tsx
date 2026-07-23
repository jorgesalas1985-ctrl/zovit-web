"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { IntranetUsersManager } from "@/components/intranet/IntranetUsersManager";
import Link from "next/link";

export default function IntranetUsersAdminPage() {
  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]} permission="manage_intranet_users">
      <IntranetShell
        title="Credenciales intranet"
        description="Crea y administra accesos internos con correo, contraseña y perfil. Los trabajadores ingresan por Ingreso a intranet en la home."
        kicker="GESTIÓN DE ACCESOS"
      >
        <IntranetUsersManager />

        <Link href="/intranet/admin" className="secondaryButton wide">
          Volver a administración
        </Link>
      </IntranetShell>
    </IntranetGuard>
  );
}
