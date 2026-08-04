import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  GraduationCap,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

export default function IntranetSupervisorPage() {
  return (
    <IntranetGuard allowedRoles={["supervisor"]}>
      <IntranetShell
        title="Portal evaluador / supervisor"
        description="Revisa tu informacion interna y prepara evaluaciones tecnicas ZOVIT segun competencias asignadas."
      >
        <div className="intranetGrid">
          <Link href="/intranet/liquidaciones" className="intranetCard">
            <Wallet size={24} />
            <h3>Mi informacion</h3>
            <p>Liquidaciones, antecedentes y beneficios propios.</p>
          </Link>
          <Link href="/intranet/equipo" className="intranetCard">
            <Users size={24} />
            <h3>Equipo a cargo</h3>
            <p>Antecedentes resumidos de trabajadores bajo tu supervision.</p>
          </Link>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>Evaluaciones asignadas</h3>
            <p>Pruebas tecnicas, evidencias, puntajes y decisiones (proximamente).</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <GraduationCap size={24} />
            <h3>Alumnos y profesionales</h3>
            <p>Personas asignadas para evaluar competencias ZOVIT (proximamente).</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldCheck size={24} />
            <h3>Alcance del evaluador</h3>
            <p>Dominios, riesgo permitido y segunda revision para casos sensibles.</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <FileText size={24} />
            <h3>Reportes de evaluacion</h3>
            <p>Indicadores operativos de evaluaciones tecnicas (proximamente).</p>
          </article>
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
