import { RoleGuard } from "@/components/RoleGuard";
import { LineChart, ShieldCheck, UsersRound } from "lucide-react";
import { PanelProfileHeader } from "@/components/panel/PanelProfileHeader";
import { ProfileSectionMenu } from "@/components/panel/ProfileSectionMenu";

export default function InstitutionPage() {
  return (
    <RoleGuard>
      <main className="simplePage profileOverviewPage">
        <PanelProfileHeader account="institution" />
        <section className="formPageCard profileOverviewCard">
          <ProfileSectionMenu options={[
            { href: "/institucion?seccion=alumnos", label: "Alumnos vinculados", description: "Gestiona cohortes, perfiles y documentos semestrales." },
            { href: "/institucion?seccion=certificacion", label: "Certificación", description: "Revisa identidad, estudios y competencias verificables." },
            { href: "/institucion?seccion=reportes", label: "Reportes", description: "Consulta indicadores de empleabilidad, cumplimiento y avance." },
          ]} />
          <div className="intranetGrid legacyProfileLinks">
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
