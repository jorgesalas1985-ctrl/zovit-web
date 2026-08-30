import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { SuperAdminMenu } from "@/components/intranet/SuperAdminMenu";

export default function IntranetFinancePage() {
  return (
    <IntranetGuard allowedRoles={["super_admin"]}>
      <IntranetShell
        title="Centro de control"
        description="Finanzas, cuentas, personal y herramientas privadas organizadas en un solo lugar."
        kicker="ACCESOS PRINCIPALES"
        showHeader={false}
      >
        <SuperAdminMenu />
      </IntranetShell>
    </IntranetGuard>
  );
}
