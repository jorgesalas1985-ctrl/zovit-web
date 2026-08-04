import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, Lock, ShieldCheck } from "lucide-react";
import { buildDigitalPassport } from "@/lib/passport/buildPassport";
import { ECOSYSTEM_ROLE_LABELS } from "@/lib/ecosystem/roles";
import { OPERATIONAL_STATUS_LABELS } from "@/lib/operational/status";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STATUS_LABELS = {
  complete: "Completo",
  partial: "En proceso",
  pending: "Pendiente",
  locked: "No habilitado",
} as const;

const STATUS_ICONS = {
  complete: BadgeCheck,
  partial: Clock3,
  pending: ShieldCheck,
  locked: Lock,
} as const;

export default async function DigitalPassportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,role,can_act_as_client,can_act_as_professional,active_mode,intranet_role,identity_status,identity_verified,biometric_verified,study_verification_status,study_verified,worker_registration_status,primary_service_profile",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.id) redirect("/login?error=perfil-incompleto");

  const passport = buildDigitalPassport({
    id: profile.id,
    email: user.email ?? null,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role,
    can_act_as_client: profile.can_act_as_client,
    can_act_as_professional: profile.can_act_as_professional,
    active_mode: profile.active_mode,
    intranet_role: profile.intranet_role,
    identity_status: profile.identity_status,
    identity_verified: profile.identity_verified,
    biometric_verified: profile.biometric_verified,
    study_verification_status: profile.study_verification_status,
    study_verified: profile.study_verified,
    worker_registration_status: profile.worker_registration_status,
    primary_service_profile: profile.primary_service_profile,
  });

  return (
    <main className="dashboardPage">
      <section className="dashboardHero">
        <div>
          <p className="kicker light">PASAPORTE DIGITAL ZOVIT</p>
          <h1>{passport.owner.displayName}</h1>
          <p>
            Identidad, formacion, competencias, certificaciones, experiencia y estado operativo
            reunidos en una sola vista privada.
          </p>
        </div>
        <div className="panelHeroActions">
          <Link className="whiteButton" href="/panel">
            Volver al panel
          </Link>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">ROLES DEL ECOSISTEMA</p>
            <h2>Tu posicion actual en ZOVIT</h2>
          </div>
        </div>
        <div className="roleModeDual">
          {passport.roles.length ? (
            passport.roles.map((role) => (
              <span className="roleModeBadge roleModeBadge--active" key={role}>
                {ECOSYSTEM_ROLE_LABELS[role]}
              </span>
            ))
          ) : (
            <span className="roleModeBadge roleModeBadge--idle">Sin rol operativo</span>
          )}
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">ESTADO OPERATIVO</p>
            <h2>{OPERATIONAL_STATUS_LABELS[passport.operational.status]}</h2>
            <p className="muted">
              {passport.operational.canAcceptWork
                ? "Tu estado permite operar segun las reglas actuales."
                : "Hay condiciones pendientes antes de operar completamente."}
            </p>
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">RENOVACION SEMESTRAL</p>
            <h2>
              {passport.renewalPreview.shouldSuspend
                ? "Cuenta sujeta a suspension"
                : passport.renewalPreview.status === "complete"
                  ? "Renovacion al dia"
                  : "Renovacion pendiente"}
            </h2>
            <p className="muted">{passport.renewalPreview.summary}</p>
            {passport.renewalPreview.deadlineAt ? (
              <p className="muted">Plazo: {passport.renewalPreview.deadlineAt}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">CERTIFICACION TECNICA ZOVIT</p>
            <h2>
              {passport.certificationPreview.eligible
                ? "Elegible para emision"
                : "Requiere evaluacion ZOVIT"}
            </h2>
            <p className="muted">
              La formacion academica aporta evidencia, pero no emite una certificacion ZOVIT por si
              sola. La certificacion requiere identidad validada, evaluacion tecnica aprobada y
              alcance definido.
            </p>
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">EVALUACION TECNICA</p>
            <h2>
              {passport.evaluationPreview.canIssueCertification
                ? "Evaluacion aprobada"
                : "Evaluacion pendiente"}
            </h2>
            <p className="muted">
              La evaluacion tecnica registra evidencia, puntaje, decision del evaluador, alcance
              permitido y si requiere supervision. Solo una evaluacion aprobada puede habilitar una
              certificacion ZOVIT.
            </p>
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">ASIGNACION DE EVALUACION</p>
            <h2>
              {passport.evaluationAssignmentPreview.ready
                ? "Lista para asignar"
                : "Pendiente de asignacion"}
            </h2>
            <p className="muted">{passport.evaluationAssignmentPreview.summary}</p>
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">AUDITORIA TECNICA</p>
            <h2>
              {passport.evaluationAuditPreview.canApproveCertification
                ? "Puede avanzar a certificacion"
                : "Requiere control previo"}
            </h2>
            <p className="muted">{passport.evaluationAuditPreview.summary}</p>
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">COLA OPERATIVA</p>
            <h2>
              {passport.reviewQueuePreview.items.length
                ? `${passport.reviewQueuePreview.items.length} pendiente(s)`
                : "Sin pendientes operativos"}
            </h2>
            <p className="muted">{passport.reviewQueuePreview.summary}</p>
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">AUTOMATIZACION DEL ECOSISTEMA</p>
            <h2>Decision sugerida</h2>
            <p className="muted">{passport.automationPreview.summary}</p>
            {passport.automationPreview.requiresHumanApproval ? (
              <p className="muted">
                Las acciones sensibles requieren aprobacion humana antes de ejecutarse.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panelSection compactSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">MATCHING RESPONSABLE</p>
            <h2>{passport.matchingPreview.eligible ? "Puede entrar a matching" : "Matching limitado"}</h2>
            <p className="muted">
              El matching responsable considera estado operativo, competencias, certificaciones,
              evaluacion, riesgo, supervision, distancia, reputacion y experiencia antes de
              recomendar a una persona.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboardGrid">
        {passport.sections.map((section) => {
          const Icon = STATUS_ICONS[section.status];
          const content = (
            <>
              <div className="dashboardIcon">
                <Icon />
              </div>
              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                <p className="muted">{STATUS_LABELS[section.status]}</p>
              </div>
              {section.href ? <ArrowRight /> : null}
            </>
          );

          if (section.href) {
            return (
              <Link href={section.href} className="dashboardCard" key={section.id}>
                {content}
              </Link>
            );
          }

          return (
            <article className="dashboardCard" key={section.id}>
              {content}
            </article>
          );
        })}
      </section>

      <section className="panelSection">
        <div className="sectionHeading">
          <div>
            <p className="kicker">CATALOGO MAESTRO</p>
            <h2>Competencias base ZOVIT</h2>
            <p className="muted">
              Esta lista muestra competencias disponibles para relacionar formacion, evaluaciones,
              servicios y futuras certificaciones. No equivale a certificaciones ya emitidas.
            </p>
          </div>
        </div>
        <div className="dashboardGrid">
          {passport.competencyCatalogPreview.map((competency) => (
            <article className="dashboardCard" key={competency.id}>
              <div className="dashboardIcon">
                <BadgeCheck />
              </div>
              <div>
                <h3>{competency.name}</h3>
                <p>{competency.description}</p>
                <p className="muted">Version {competency.version}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
