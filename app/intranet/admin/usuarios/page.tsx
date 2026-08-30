"use client";

import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { IntranetUsersManager } from "@/components/intranet/IntranetUsersManager";

export default function IntranetUsersAdminPage() {
  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]} permission="manage_intranet_users">
      <IntranetShell
        title="Accesos internos"
        description="Crea y administra cuentas corporativas."
        kicker="ADMINISTRACIÓN"
        backHref="/intranet/finanzas"
      >
        <IntranetUsersManager />

      </IntranetShell>
    </IntranetGuard>
  );
}
