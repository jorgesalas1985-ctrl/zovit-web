"use client";

import { CredentialAvatar } from "@/components/credential/CredentialAvatar";
import { getCredentialPublicUrl } from "@/lib/credential/url";
import type { PublicCredentialProfile } from "@/lib/credential/types";
import { IdentityBadge } from "@/components/verification/IdentityBadge";
import {
  Check,
  Copy,
  GraduationCap,
  Linkedin,
  Mail,
  MessageCircle,
  Printer,
  QrCode,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type ZovitCredentialCardProps = {
  profile: PublicCredentialProfile;
  showActions?: boolean;
};

function fullName(profile: PublicCredentialProfile): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Usuario ZOVIT";
}

function roleLabel(role: string): string {
  if (role === "professional") return "Profesional";
  if (role === "admin") return "Administrador";
  return "Cliente";
}

export function ZovitCredentialCard({ profile, showActions = true }: ZovitCredentialCardProps) {
  const verifyUrl = useMemo(() => getCredentialPublicUrl(profile.id), [profile.id]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const verified = profile.identity_verified && profile.biometric_verified;
  const name = fullName(profile);

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(verifyUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });

    return () => {
      active = false;
    };
  }, [verifyUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setShareMessage("Enlace copiado al portapapeles.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareMessage("No se pudo copiar el enlace.");
    }
  }

  const shareText = `Certificado / Credencial ZOVIT · ${name}\nExperiencia e identidad verificables.\nVerifica aquí: ${verifyUrl}`;

  async function shareNative() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: `Certificado ZOVIT · ${name}`,
        text: `Verifica mi certificado ZOVIT (identidad y experiencia): ${name}`,
        url: verifyUrl,
      });
    } catch {
      // Usuario canceló o el navegador bloqueó el share.
    }
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareEmail() {
    const subject = encodeURIComponent(`Certificado ZOVIT · ${name}`);
    const body = encodeURIComponent(
      `Hola,\n\nAdjunto el enlace a mi certificado / credencial ZOVIT para que puedan verificar mi identidad y experiencia:\n${verifyUrl}\n\nPueden escanear el código QR o abrir el enlace. Este certificado es gratuito y está respaldado por ZOVIT.\n\n— ${name}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function shareLinkedIn() {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareTelegram() {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(verifyUrl)}&text=${encodeURIComponent(
        `Certificado ZOVIT · ${name}`
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareSms() {
    const body = encodeURIComponent(shareText);
    window.location.href = `sms:?&body=${body}`;
  }

  function printCredential() {
    document.body.classList.add("print-credential");
    document.body.classList.remove("print-cv");
    window.print();
    window.setTimeout(() => document.body.classList.remove("print-credential"), 300);
  }

  return (
    <article className="credentialCard" data-doc="credential">
      <header className="credentialCardHeader">
        <div className="credentialBrand">
          <span className="credentialBrandMark">Z</span>
          <div>
            <p className="kicker">CERTIFICADO ZOVIT</p>
            <strong>Identidad y experiencia verificables</strong>
          </div>
        </div>
        <span className={`credentialStatus ${verified ? "verified" : "pending"}`}>
          <ShieldCheck size={16} />
          {verified ? "Certificado verificado" : "Pendiente de verificación"}
        </span>
      </header>

      <div className="credentialCardBody">
        <CredentialAvatar profileId={profile.id} avatarUrl={profile.avatar_url} name={name} />

        <div className="credentialDetails">
          <p className="credentialRole">{roleLabel(profile.role).toUpperCase()}</p>
          <h1>{name}</h1>
          {profile.rut && <p className="credentialRut">RUT {profile.rut}</p>}
          <IdentityBadge
            verified={profile.identity_verified}
            role={profile.role === "professional" ? "professional" : "client"}
          />
          {profile.role === "professional" && profile.study_verified && (
            <span className="identityBadge">
              <GraduationCap size={14} /> Estudios verificados
            </span>
          )}
          {profile.role === "professional" && profile.experience_level && (
            <p className="credentialMeta">Experiencia ZOVIT: {profile.experience_level}</p>
          )}
          <p className="credentialHint">
            {verified
              ? "Certificado gratuito ZOVIT. Úsalo para presentar tu identidad y experiencia al postular a un trabajo, o para validarte ante un cliente."
              : "Esta credencial existe, pero la verificación biométrica aún no está completa."}
          </p>
          {!profile.avatar_url && (
            <p className="credentialPhotoHint no-print">
              Sube tu foto en{" "}
              <Link href="/perfil" className="textLink">
                Mi perfil
              </Link>{" "}
              para que aparezca en este círculo.
            </p>
          )}
        </div>

        <div className="credentialQrBlock">
          {qrDataUrl ? (
            <Image src={qrDataUrl} alt="Código QR de verificación" width={220} height={220} unoptimized />
          ) : (
            <div className="credentialQrPlaceholder">
              <QrCode size={42} />
              <span>Generando QR…</span>
            </div>
          )}
          <p className="credentialQrCaption">Escanea para verificar</p>
          <a className="credentialVerifyLink" href={verifyUrl}>
            {verifyUrl.replace(/^https?:\/\//, "")}
          </a>
        </div>
      </div>

      {showActions && (
        <div className="credentialActions no-print">
          <button type="button" className="secondaryButton" onClick={printCredential}>
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button type="button" className="secondaryButton" onClick={shareEmail}>
            <Mail size={16} /> Correo
          </button>
          <button type="button" className="secondaryButton" onClick={shareWhatsApp}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button type="button" className="secondaryButton" onClick={shareSms}>
            <Smartphone size={16} /> SMS
          </button>
          <button type="button" className="secondaryButton" onClick={shareLinkedIn}>
            <Linkedin size={16} /> LinkedIn
          </button>
          <button type="button" className="secondaryButton" onClick={shareTelegram}>
            <Send size={16} /> Telegram
          </button>
          <button type="button" className="secondaryButton" onClick={copyLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
          {"share" in navigator && (
            <button type="button" className="primaryButton" onClick={shareNative}>
              <Share2 size={16} /> Más opciones
            </button>
          )}
        </div>
      )}

      {shareMessage && <p className="notice compact no-print">{shareMessage}</p>}
    </article>
  );
}
