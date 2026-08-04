import { RoleGuard } from "@/components/RoleGuard";
import { Landmark, LineChart, ShieldCheck, UsersRound } from "lucide-react";

export default function InstitutionPage() {
  return (
    <RoleGuard>
      <main className="simplePage">
        <section className="formPageCard">
          <div className="eyebrow">
            <Landmark size={16} /> Ecosistema institucional
          </div>
          <h1>Perfil Institucion</h1>
          <p className="muted">
            Espacio para instituciones que necesitan vincular alumnos, certificados,
            reportes y trazabilidad educativa dentro de ZOVIT.
          </p>

          <div className="intranetGrid">
            <article className="intranetCard intranetCardStatic">
              <UsersRound size={22} />
              <h3>Alumnos vinculados</h3>
              <p>Gestion de cohortes, perfiles y documentos semestrales.</p>
            </article>
            <article className="intranetCard intranetCardStatic">
              <ShieldCheck size={22} />
              <h3>Certificacion</h3>
              <p>Validacion de identidad, estudios y competencias verificables.</p>
            </article>
            <article className="intranetCard intranetCardStatic">
              <LineChart size={22} />
              <h3>Reportes</h3>
              <p>Indicadores futuros para empleabilidad, cumplimiento y avance.</p>
            </article>
          </div>
        </section>
      </main>
    </RoleGuard>
  );
}
