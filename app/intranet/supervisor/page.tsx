import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import { FileText, Gift, Users, Wallet } from "lucide-react";

export default function IntranetSupervisorPage() {
  return (
    <IntranetGuard allowedRoles={["supervisor"]}>
      <IntranetShell
        title="Portal supervisor"
        description="Revisa tu información personal y la de tu equipo directo."
      >
        <div className="intranetGrid">
          <Link href="/intranet/liquidaciones" className="intranetCard">
            <Wallet size={24} />
            <h3>Mi información</h3>
            <p>Liquidaciones, antecedentes y beneficios propios.</p>
          </Link>
          <Link href="/intranet/equipo" className="intranetCard">
            <Users size={24} />
            <h3>Equipo a cargo</h3>
            <p>Antecedentes resumidos de trabajadores bajo tu supervisión.</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <FileText size={24} />
            <h3>Reportes de área</h3>
            <p>Indicadores operativos del equipo (próximamente).</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Gift size={24} />
            <h3>Beneficios del equipo</h3>
            <p>Vista resumida de convenios aplicables (próximamente).</p>
          </article>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
