"use client";

import { getCredentialPublicUrl } from "@/lib/credential/url";
import type { PublicCredentialProfile } from "@/lib/credential/types";
import { IdentityBadge } from "@/components/verification/IdentityBadge";
import {
  Check,
  Copy,
  GraduationCap,
  Mail,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
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

  async function shareNative() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: `Credencial ZOVIT · ${name}`,
        text: `Verifica mi credencial ZOVIT: ${name}`,
        url: verifyUrl,
      });
    } catch {
      // Usuario canceló o el navegador bloqueó el share.
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Credencial ZOVIT · ${name}\nVerifica aquí: ${verifyUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function shareEmail() {
    const subject = encodeURIComponent(`Credencial ZOVIT · ${name}`);
    const body = encodeURIComponent(
      `Hola,\n\nPuedes verificar mi credencial ZOVIT en el siguiente enlace:\n${verifyUrl}\n\nEscanea el código QR o abre el enlace para confirmar mi identidad.\n\n— ${name}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function printCredential() {
    window.print();
  }

  return (
    <article className="credentialCard">
      <header className="credentialCardHeader">
        <div className="credentialBrand">
          <span className="credentialBrandMark">Z</span>
          <div>
            <p className="kicker">CREDENCIAL ZOVIT</p>
            <strong>Identidad verificable</strong>
          </div>
        </div>
        <span className={`credentialStatus ${verified ? "verified" : "pending"}`}>
          <ShieldCheck size={16} />
          {verified ? "Verificado" : "Pendiente de verificación"}
        </span>
      </header>

      <div className="credentialCardBody">
        <div className="credentialPhotoWrap">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={`Foto de ${name}`}
              width={160}
              height={200}
              className="credentialPhoto"
              unoptimized
            />
          ) : (
            <div className="credentialPhotoPlaceholder">
              <UserRound size={56} />
              <span>Sin foto</span>
            </div>
          )}
        </div>

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
              ? "Escanea el código QR o abre el enlace para confirmar la identidad al momento del servicio."
              : "Esta credencial existe, pero la verificación biométrica aún no está completa."}
          </p>
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
            <Printer size={16} /> Imprimir
          </button>
          <button type="button" className="secondaryButton" onClick={copyLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
          <button type="button" className="secondaryButton" onClick={shareWhatsApp}>
            WhatsApp
          </button>
          <button type="button" className="secondaryButton" onClick={shareEmail}>
            <Mail size={16} /> Correo
          </button>
          {"share" in navigator && (
            <button type="button" className="primaryButton" onClick={shareNative}>
              <Share2 size={16} /> Compartir
            </button>
          )}
        </div>
      )}

      {shareMessage && <p className="notice compact no-print">{shareMessage}</p>}
    </article>
  );
}
