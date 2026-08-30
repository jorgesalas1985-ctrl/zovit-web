import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { ZovitAiVault } from "@/components/intranet/ZovitAiVault";

export default function ZovitAiPage() {
  return (
    <IntranetGuard allowedRoles={["super_admin"]}>
      <IntranetShell title="ZOVIT IA" description="Área privada de entrenamiento y gobierno de inteligencia artificial." kicker="SOLO SUPERADMINISTRADOR" backHref="/intranet/finanzas">
        <ZovitAiVault />
      </IntranetShell>
    </IntranetGuard>
  );
}
