"use client";

import { getCredentialPublicUrl } from "@/lib/credential/url";
import type { PublicCredentialProfile } from "@/lib/credential/types";
import {
  EXPERIENCE_BADGES,
  formatHours,
  type ProfessionalExperience,
  type ProfessionalStats,
} from "@/lib/experience/types";
import {
  Briefcase,
  Check,
  Copy,
  Linkedin,
  Mail,
  MessageCircle,
  Printer,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CredentialAvatar } from "@/components/credential/CredentialAvatar";

type ZovitExperienceCvProps = {
  profile: PublicCredentialProfile;
  experience: ProfessionalExperience[];
  stats: ProfessionalStats | null;
  showActions?: boolean;
};

function fullName(profile: PublicCredentialProfile): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Usuario ZOVIT";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      month: "short",
      year: "numeric",
      timeZone: "America/Santiago",
    });
  } catch {
    return iso;
  }
}

export function ZovitExperienceCv({
  profile,
  experience,
  stats,
  showActions = true,
}: ZovitExperienceCvProps) {
  const verifyUrl = useMemo(() => getCredentialPublicUrl(profile.id), [profile.id]);
  const name = fullName(profile);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const level = stats?.experience_level ?? (profile.experience_level as ProfessionalStats["experience_level"]) ?? "junior";
  const badge = EXPERIENCE_BADGES[level] ?? EXPERIENCE_BADGES.junior;
  const verifiedJobs = experience.filter((item) => item.verified);

  const shareText = `Curriculum vitae ZOVIT · ${name}\nExperiencia laboral verificada.\nVerifica aquí: ${verifyUrl}#cv`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${verifyUrl}#cv`);
      setCopied(true);
      setMessage("Enlace del CV copiado.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("No se pudo copiar el enlace.");
    }
  }

  function printCv() {
    document.body.classList.add("print-cv");
    document.body.classList.remove("print-credential");
    window.print();
    window.setTimeout(() => document.body.classList.remove("print-cv"), 300);
  }

  async function shareNative() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `CV ZOVIT · ${name}`,
        text: `Curriculum vitae con experiencia verificada ZOVIT: ${name}`,
        url: `${verifyUrl}#cv`,
      });
    } catch {
      // cancelado
    }
  }

  return (
    <section className="zovitCvSection">
      <article className="zovitCvDoc" data-doc="cv">
        <header className="zovitCvHeader">
          <div className="zovitCvBrand">
            <span className="credentialBrandMark">Z</span>
            <div>
              <p className="kicker">CURRICULUM VITAE ZOVIT</p>
              <strong>Experiencia laboral verificada</strong>
            </div>
          </div>
          <span className="credentialStatus verified">
            <ShieldCheck size={16} /> Solo trabajos certificados
          </span>
        </header>

        <div className="zovitCvIntro">
          <CredentialAvatar profileId={profile.id} avatarUrl={profile.avatar_url} name={name} />
          <div className="zovitCvIntroText">
            <p className="credentialRole">PROFESIONAL</p>
            <h2>{name}</h2>
            {profile.rut && <p className="credentialRut">RUT {profile.rut}</p>}
            <p className="zovitCvLevel">{badge.label}</p>
            <p className="muted">{badge.description}</p>
          </div>
        </div>

        {stats && (
          <dl className="zovitCvStats">
            <div>
              <dt>Trabajos verificados</dt>
              <dd>{stats.completed_jobs}</dd>
            </div>
            <div>
              <dt>Horas registradas</dt>
              <dd>{formatHours(stats.total_hours)}</dd>
            </div>
            <div>
              <dt>Valoración</dt>
              <dd>
                {stats.rating_count > 0 ? (
                  <span className="zovitCvRating">
                    <Star size={14} fill="currentColor" /> {stats.average_rating.toFixed(1)}
                    <small>({stats.rating_count})</small>
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        )}

        <div className="zovitCvBody">
          <div className="zovitCvSectionHead">
            <Briefcase size={18} />
            <h3>Experiencia laboral certificada</h3>
          </div>

          {verifiedJobs.length === 0 ? (
            <p className="zovitCvEmpty">
              Aún no hay trabajos finalizados y verificados en ZOVIT para este perfil. Cuando complete
              servicios en la plataforma, aparecerán aquí automáticamente.
            </p>
          ) : (
            <ul className="zovitCvList">
              {verifiedJobs.map((item) => (
                <li key={item.id} className="zovitCvItem">
                  <div className="zovitCvItemHead">
                    <strong>{item.category}</strong>
                    <time>{formatDate(item.completed_at)}</time>
                  </div>
                  <p>{item.service_summary}</p>
                  <div className="zovitCvItemMeta">
                    <span className="verifiedTag">Verificado por ZOVIT</span>
                    <span>{formatHours(Number(item.hours_worked))}</span>
                    {item.client_display_name && <span>{item.client_display_name}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="zovitCvFooter">
          <p>
            Documento generado por ZOVIT · Solo incluye experiencia certificada y verificada en la
            plataforma. Validar en {verifyUrl.replace(/^https?:\/\//, "")}
          </p>
        </footer>
      </article>

      {showActions && (
        <div className="credentialActions no-print">
          <button type="button" className="primaryButton" onClick={printCv}>
            <Printer size={16} /> Imprimir / PDF CV
          </button>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => {
              const subject = encodeURIComponent(`CV ZOVIT · ${name}`);
              const body = encodeURIComponent(
                `Hola,\n\nTe comparto mi curriculum vitae con experiencia verificada en ZOVIT:\n${verifyUrl}#cv\n\n— ${name}`,
              );
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
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${verifyUrl}#cv`)}`,
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
                `https://t.me/share/url?url=${encodeURIComponent(`${verifyUrl}#cv`)}&text=${encodeURIComponent(`CV ZOVIT · ${name}`)}`,
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
            <button type="button" className="secondaryButton" onClick={() => void shareNative()}>
              <Share2 size={16} /> Más opciones
            </button>
          )}
          {message && <p className="notice compact">{message}</p>}
        </div>
      )}
    </section>
  );
}
