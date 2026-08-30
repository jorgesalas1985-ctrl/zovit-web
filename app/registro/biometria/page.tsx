"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, FileCheck2, FolderOpen, GraduationCap, IdCard, Printer, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { CredentialAvatar } from "@/components/credential/CredentialAvatar";
import { useAuth } from "@/components/AuthProvider";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import { getActiveMode } from "@/lib/auth/roles";
import { isoToChileanDate } from "@/lib/ui/chileanDate";
import type { IdentityDocumentType } from "@/lib/verification/types";
import { supabase } from "@/lib/supabase";

type PersonalData = {
  first_name: string | null;
  last_name: string | null;
  rut: string | null;
  birth_date: string | null;
  avatar_url: string | null;
};

type CredentialRow = {
  id: string;
  credential_name: string | null;
  institution: string | null;
  profession: string | null;
  status: string;
};

const DOCUMENT_LABELS: Partial<Record<IdentityDocumentType, string>> = {
  cedula_front: "Cédula de identidad · frontal",
  cedula_back: "Cédula de identidad · reverso",
  selfie: "Selfie de verificación",
  liveness_proof: "Prueba de vida",
  certificado_antecedentes: "Certificado de antecedentes",
  certificado_estudios: "Certificado de estudios",
};

export default function DigitalPassportPage() {
  const { user, profile } = useAuth();
  const { state } = useIdentityVerification();
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const activeMode = profile ? getActiveMode(profile) : "client";
  const isStudent = profile?.account_kind === "student";
  const fullName = [personalData?.first_name, personalData?.last_name].filter(Boolean).join(" ") || "Usuario ZOVIT";

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("first_name,last_name,rut,birth_date,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setPersonalData(data as PersonalData | null));

    void supabase
      .from("worker_credentials")
      .select("id,credential_name,institution,profession,status")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setCredentials((data ?? []) as CredentialRow[]));
  }, [user]);

  useEffect(() => {
    if (!state?.documents.length) return;
    void Promise.all(
      state.documents.map(async (document) => {
        const { data } = await supabase.storage
          .from("identity-documents")
          .createSignedUrl(document.storage_path, 60 * 10);
        return [document.id, data?.signedUrl ?? ""] as const;
      }),
    ).then((entries) => setDocumentUrls(Object.fromEntries(entries.filter(([, url]) => url))));
  }, [state?.documents]);

  function documentItem(type: IdentityDocumentType) {
    const document = state?.documents.find((item) => item.document_type === type);
    const url = document ? documentUrls[document.id] : "";
    return (
      <li key={type} className="passportDocumentItem">
        <span>{DOCUMENT_LABELS[type]}</span>
        {document && url ? (
          <a href={url} target="_blank" rel="noreferrer" className="passportFolderButton">
            <FolderOpen size={19} /> Ver archivo
          </a>
        ) : (
          <span className="passportPending">Pendiente</span>
        )}
      </li>
    );
  }

  function printCertificate() {
    document.body.classList.add("print-digital-passport");
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => document.body.classList.remove("print-digital-passport"), 300);
    }, 80);
  }

  return (
    <Protected>
      {isStudent ? (
        <div className="roleModeBanner roleModeBanner--dashboard" aria-label="Tipo de cuenta Alumno">
          <span className="roleModeBadge roleModeBadge--student roleModeBadge--active">ALUMNO</span>
        </div>
      ) : (
        <RoleModeBanner role={activeMode} />
      )}
      <main className="simplePage">
        <section className="formPageCard verificationPage">
          <div className="passportTopActions no-print">
            <Link href="/alumno" className="secondaryButton">
              <ArrowLeft size={18} /> Volver
            </Link>
            <button type="button" className="primaryButton" onClick={printCertificate}>
              <Printer size={18} /> Imprimir certificado gratuito
            </button>
          </div>
          <div className="eyebrow"><FileCheck2 size={16} /> PERFIL ZOVIT</div>
          <h1>Certificado Digital</h1>
          <p className="muted">Toda tu información y documentos organizados en un solo lugar.</p>

          <div className="passportCategoryGrid passportCategoryGrid-main">
            <article className="passportCategoryCard passportPersonalCard">
              <UserRound size={24} />
              <h2>Datos personales</h2>
              {user && (
                <CredentialAvatar
                  profileId={user.id}
                  avatarUrl={personalData?.avatar_url ?? null}
                  name={fullName}
                />
              )}
              <ul>
                <li>Nombre: {fullName}</li>
                <li>Correo: {user?.email ?? "Pendiente"}</li>
                <li>RUT: {personalData?.rut || "Pendiente"}</li>
                <li>Fecha de nacimiento: {personalData?.birth_date ? isoToChileanDate(personalData.birth_date) : "Pendiente"}</li>
              </ul>
              <Link href="/perfil">Ver o editar datos <ArrowRight size={15} /></Link>
            </article>

            <article className="passportCategoryCard">
              <IdCard size={24} />
              <h2>Identidad</h2>
              <ul className="passportDocumentList">
                {documentItem("cedula_front")}
                {documentItem("cedula_back")}
                {documentItem("selfie")}
                {documentItem("liveness_proof")}
                {documentItem("certificado_antecedentes")}
              </ul>
              <p className="passportStatus">Estado: {state?.identity_verified ? "Verificada" : state?.identity_status === "pending" ? "En revisión" : "Pendiente"}</p>
            </article>

            <article className="passportCategoryCard">
              <GraduationCap size={24} />
              <h2>Datos académicos</h2>
              <ul className="passportDocumentList">{documentItem("certificado_estudios")}</ul>
              {credentials.filter((item) => item.institution).map((item) => (
                <p key={item.id}>{item.credential_name || item.profession || "Certificado"} · {item.institution} · {item.status}</p>
              ))}
              <Link href="/registro/trabajador">Agregar antecedentes <ArrowRight size={15} /></Link>
            </article>

            <article className="passportCategoryCard">
              <BriefcaseBusiness size={24} />
              <h2>Datos laborales</h2>
              {credentials.length ? credentials.map((item) => (
                <p key={item.id}>{item.profession || item.credential_name || "Antecedente laboral"} · {item.status}</p>
              )) : <p>Sin antecedentes laborales cargados.</p>}
              <Link href="/registro/trabajador">Completar experiencia <ArrowRight size={15} /></Link>
            </article>
          </div>

          <article className="digitalPassportCertificate" aria-label="Certificado imprimible ZOVIT">
            <div className="digitalPassportCertificateBrand">ZOVIT</div>
            <BadgeCheck size={54} />
            <p className="kicker">CERTIFICADO DIGITAL GRATUITO</p>
            <h2>Certificado de perfil {isStudent ? "Alumno" : activeMode === "professional" ? "Profesional" : "Cliente"}</h2>
            <p>Se certifica que</p>
            <h3>{fullName}</h3>
            <dl>
              <div><dt>RUT</dt><dd>{personalData?.rut || "Pendiente"}</dd></div>
              <div><dt>Tipo de perfil</dt><dd>{isStudent ? "Alumno" : activeMode === "professional" ? "Profesional" : "Cliente"}</dd></div>
              <div><dt>Identidad</dt><dd>{state?.identity_verified ? "Verificada" : state?.identity_status === "pending" ? "En revisión" : "Pendiente"}</dd></div>
              <div><dt>Antecedentes académicos</dt><dd>{state?.study_verified ? "Verificados" : state?.study_verification_status === "pending" ? "En revisión" : "Pendientes"}</dd></div>
              <div><dt>Credenciales cargadas</dt><dd>{credentials.length}</dd></div>
            </dl>
            <p className="digitalPassportCertificateFoot">Documento emitido gratuitamente desde el Certificado Digital ZOVIT.</p>
          </article>
        </section>
      </main>
    </Protected>
  );
}
