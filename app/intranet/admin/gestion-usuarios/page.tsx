import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { PlatformUsersManager } from "@/components/intranet/PlatformUsersManager";

export default function IntranetGestionUsuariosPage() {
  return (
    <IntranetGuard allowedRoles={["super_admin"]} permission="manage_all_platform_accounts">
      <IntranetShell
        title="Todas las cuentas"
        description="Solo super administrador: revisión completa de clientes, profesionales e intranet."
        kicker="SUPER ADMIN"
      >
        <PlatformUsersManager />
      </IntranetShell>
    </IntranetGuard>
  );
}
