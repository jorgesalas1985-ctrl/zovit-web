import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import { FileText, Gift, Wallet } from "lucide-react";

export default function IntranetWorkerPage() {
  return (
    <IntranetGuard allowedRoles={["worker"]}>
      <IntranetShell
        title="Portal trabajador"
        description="Consulta tus antecedentes personales, beneficios y liquidaciones de sueldo."
      >
        <div className="intranetGrid">
          <Link href="/intranet/liquidaciones" className="intranetCard">
            <Wallet size={24} />
            <h3>Mis liquidaciones</h3>
            <p>Historial de sueldos y descargas mensuales.</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <FileText size={24} />
            <h3>Antecedentes personales</h3>
            <p>Datos contractuales, contacto y documentación (próximamente).</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Gift size={24} />
            <h3>Beneficios</h3>
            <p>Seguros, convenios y beneficios ZOVIT (próximamente).</p>
          </article>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
