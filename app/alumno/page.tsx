"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { Protected } from "@/components/Protected";
import { useEffect, useState } from "react";
import { isStepComplete } from "@/lib/worker/validate";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";
import { PanelProfileHeader } from "@/components/panel/PanelProfileHeader";
import { useAuth } from "@/components/AuthProvider";

export default function StudentHomePage() {
  const { user, profile } = useAuth();
  const [completion, setCompletion] = useState<number | null>(null);
  const [accreditationStatus, setAccreditationStatus] = useState<"inactive" | "review" | "active">("inactive");
  const studentActive = accreditationStatus === "active";

  useEffect(() => {
    let active = true;
    void fetch("/api/worker/registration", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const draft = data?.registration?.draft as WorkerRegistrationDraft | undefined;
        if (!active || !draft) return;
        const completed = [1, 2, 3, 4, 5, 6].filter((step) => isStepComplete(step, draft)).length;
        setCompletion(Math.round((completed / 7) * 100));
        const status = String(data?.registration?.status ?? draft.status ?? "draft");
        setAccreditationStatus(
          status === "verified" || status === "partially_verified"
            ? "active"
            : ["submitted", "needs_info", "incomplete"].includes(status)
              ? "review"
              : "inactive",
        );
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <Protected>
      <main className="simplePage profileOverviewPage">
        <PanelProfileHeader
          account="student"
          personName={[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email?.split("@")[0]}
        />
        <section className="formPageCard profileOverviewCard">
          <Link href="/registro/trabajador" className="studentCompletionCard">
            <p className="studentCompletionIntro">Pincha aquí para terminar de completar tus datos y poder generar el certificado.</p>
            <div>
              <strong>Avance del perfil</strong>
              <span>{completion ?? 0}% completado</span>
            </div>
            <div className="workerCompletionTrack" aria-label={`${completion ?? 0}% completado`}>
              <span style={{ width: `${completion ?? 0}%` }} />
            </div>
          </Link>
          {completion === 100 && (
            <Link href="/registro/biometria" className="primaryButton studentCertificateButton">
              Generar certificado
            </Link>
          )}
          <div className="intranetGrid legacyProfileLinks">
            <article
              className={`intranetCard intranetCardStatic studentStatusCard studentStatusCard-${accreditationStatus}`}
            >
              <ShieldCheck size={24} />
              <h3>{studentActive ? "Activado" : accreditationStatus === "review" ? "En revisión" : "Desactivado"}</h3>
              <p>
                {studentActive
                  ? "Documentos y conocimientos aprobados. Tu perfil está habilitado."
                  : accreditationStatus === "review"
                    ? "Estamos revisando tus documentos y evaluaciones pendientes."
                    : "Completa el registro, la revisión documental y las evaluaciones para activarlo."}
              </p>
            </article>
            <Link href="/registro/biometria" className="intranetCard">
              <GraduationCap size={24} />
              <h3>Certificado Digital</h3>
              <p>Ver identidad, formación, competencias y trazabilidad.</p>
            </Link>
            <Link href="/registro/trabajador" className="intranetCard">
              <ArrowRight size={24} />
              <h3>Completar formación</h3>
              <p>Subir alumno regular, certificados y antecedentes.</p>
            </Link>
            <article className="intranetCard intranetCardStatic">
              <ClipboardCheck size={24} />
              <h3>Evaluaciones ZOVIT</h3>
              <p>{studentActive ? "Consulta tus conocimientos acreditados por especialidad." : "Se habilitarán cuando administración apruebe tus documentos."}</p>
            </article>
          </div>
        </section>
      </main>
    </Protected>
  );
}
