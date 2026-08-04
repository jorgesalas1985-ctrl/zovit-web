"use client";

import { ZovitCredentialCard } from "@/components/credential/ZovitCredentialCard";
import { ZovitExperienceCv } from "@/components/credential/ZovitExperienceCv";
import { ZovitPremiumCertificate } from "@/components/credential/ZovitPremiumCertificate";
import type { PublicIssuedCertificate } from "@/lib/certificates/types";
import { getCertificatePublicUrl } from "@/lib/certificates/url";
import { getCredentialPublicUrl } from "@/lib/credential/url";
import type { PublicCredentialProfile } from "@/lib/credential/types";
import type { ProfessionalExperience, ProfessionalStats } from "@/lib/experience/types";
import {
  Check,
  Copy,
  Linkedin,
  Mail,
  MessageCircle,
  Printer,
  Send,
  Share2,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type CredentialDocKind = "credential" | "cv" | "certificate";

type CredentialDocumentsHubProps = {
  profile: PublicCredentialProfile;
  experience: ProfessionalExperience[];
  stats: ProfessionalStats | null;
  certificate: PublicIssuedCertificate;
};

const PRINT_CLASSES = ["print-credential", "print-cv", "print-certificate"] as const;

function fullName(profile: PublicCredentialProfile): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Usuario ZOVIT";
}

export function CredentialDocumentsHub({
  profile,
  experience,
  stats,
  certificate,
}: CredentialDocumentsHubProps) {
  const [active, setActive] = useState<CredentialDocKind>("credential");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const name = fullName(profile);
  const isLiveCert = certificate.folio.startsWith("ZV-LIVE-");

  const credentialUrl = useMemo(() => getCredentialPublicUrl(profile.id), [profile.id]);
  const certificateUrl = useMemo(
    () =>
      isLiveCert
        ? `${credentialUrl}#certificate`
        : getCertificatePublicUrl(certificate.folio),
    [certificate.folio, credentialUrl, isLiveCert],
  );

  const activeUrl = useMemo(() => {
    if (active === "cv") return `${credentialUrl}#cv`;
    if (active === "certificate") return certificateUrl;
    return credentialUrl;
  }, [active, certificateUrl, credentialUrl]);

  const shareText = useMemo(() => {
    if (active === "cv") {
      return `Curriculum vitae ZOVIT · ${name}\nExperiencia laboral verificada.\n${activeUrl}`;
    }
    if (active === "certificate") {
      return `Certificado verificable ZOVIT · ${name}\nID: ${certificate.folio}\n${activeUrl}`;
    }
    return `Credencial ZOVIT · ${name}\nIdentidad verificable.\n${activeUrl}`;
  }, [active, activeUrl, certificate.folio, name]);

  const clearPrintClasses = useCallback(() => {
    for (const cls of PRINT_CLASSES) document.body.classList.remove(cls);
  }, []);

  const printActive = useCallback(
    (kind: CredentialDocKind = active) => {
      clearPrintClasses();
      const cls =
        kind === "cv"
          ? "print-cv"
          : kind === "certificate"
            ? "print-certificate"
            : "print-credential";
      document.body.classList.add(cls);
      window.setTimeout(() => {
        window.print();
        window.setTimeout(clearPrintClasses, 400);
      }, 80);
    },
    [active, clearPrintClasses],
  );

  const selectAndDownload = useCallback(
    (kind: CredentialDocKind) => {
      setActive(kind);
      setMessage(
        kind === "credential"
          ? "Descargando credencial…"
          : kind === "cv"
            ? "Descargando curriculum…"
            : "Descargando certificado…",
      );
      window.setTimeout(() => {
        printActive(kind);
        setMessage("Usa «Guardar como PDF» en el diálogo de impresión para descargar.");
      }, 120);
    },
    [printActive],
  );

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "cv") setActive("cv");
    if (hash === "certificate") setActive("certificate");
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setMessage("Enlace copiado al portapapeles.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("No se pudo copiar el enlace.");
    }
  }

  async function shareNative() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `ZOVIT · ${name}`,
        text: shareText,
        url: activeUrl,
      });
    } catch {
      // cancelado
    }
  }

  return (
    <div className="credentialHub">
      <div className="credentialHubLayout">
        <div className="credentialHubPreview">
          <div
            className={`credentialHubPane ${active === "credential" ? "isActive" : ""}`}
            data-print="credential"
          >
            <ZovitCredentialCard profile={profile} showActions={false} />
          </div>
          <div
            className={`credentialHubPane ${active === "cv" ? "isActive" : ""}`}
            data-print="cv"
            id="cv"
          >
            <ZovitExperienceCv
              profile={profile}
              experience={experience}
              stats={stats}
              showActions={false}
            />
          </div>
          <div
            className={`credentialHubPane ${active === "certificate" ? "isActive" : ""}`}
            data-print="certificate"
            id="certificate"
          >
            <ZovitPremiumCertificate certificate={certificate} livePreview={isLiveCert} />
          </div>
        </div>

        <aside className="credentialHubSide no-print" aria-label="Descargar documentos">
          <button
            type="button"
            className={`credentialHubDocButton ${active === "credential" ? "isActive" : ""}`}
            onClick={() => selectAndDownload("credential")}
          >
            Credencial descargable
          </button>
          <button
            type="button"
            className={`credentialHubDocButton ${active === "cv" ? "isActive" : ""}`}
            onClick={() => selectAndDownload("cv")}
          >
            Experiencia verificada
          </button>
          <button
            type="button"
            className={`credentialHubDocButton ${active === "certificate" ? "isActive" : ""}`}
            onClick={() => selectAndDownload("certificate")}
          >
            Certificado verificable
          </button>
        </aside>
      </div>

      <div className="credentialActions credentialHubActions no-print">
        <button type="button" className="secondaryButton" onClick={() => printActive()}>
          <Printer size={16} /> Imprimir / PDF
        </button>
        <button
          type="button"
          className="secondaryButton"
          onClick={() => {
            const subject = encodeURIComponent(`ZOVIT · ${name}`);
            const body = encodeURIComponent(`${shareText}\n\n— ${name}`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
          }}
        >
          <Mail size={16} /> Correo
        </button>
        <button
          type="button"
          className="secondaryButton"
          onClick={() =>
            window.open(
              `https://wa.me/?text=${encodeURIComponent(shareText)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <MessageCircle size={16} /> WhatsApp
        </button>
        <button
          type="button"
          className="secondaryButton"
          onClick={() => {
            window.location.href = `sms:?&body=${encodeURIComponent(shareText)}`;
          }}
        >
          <Smartphone size={16} /> SMS
        </button>
        <button
          type="button"
          className="secondaryButton"
          onClick={() =>
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(activeUrl)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <Linkedin size={16} /> LinkedIn
        </button>
        <button
          type="button"
          className="secondaryButton"
          onClick={() =>
            window.open(
              `https://t.me/share/url?url=${encodeURIComponent(activeUrl)}&text=${encodeURIComponent(`ZOVIT · ${name}`)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <Send size={16} /> Telegram
        </button>
        <button type="button" className="secondaryButton" onClick={() => void copyLink()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
        {"share" in navigator && (
          <button type="button" className="primaryButton" onClick={() => void shareNative()}>
            <Share2 size={16} /> Más opciones
          </button>
        )}
        {message && <p className="notice compact">{message}</p>}
      </div>
    </div>
  );
}
