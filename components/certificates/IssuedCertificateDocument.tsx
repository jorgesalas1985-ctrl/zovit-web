"use client";

import {
  buildCertificateLinkedInUrl,
  buildCertificateMailto,
  buildCertificateSmsUrl,
  buildCertificateTelegramUrl,
  buildCertificateWhatsAppUrl,
} from "@/lib/certificates/delivery";
import { getCertificatePublicUrl, getCertificateValidateHubUrl } from "@/lib/certificates/url";
import type { PublicIssuedCertificate } from "@/lib/certificates/types";
import { formatHours } from "@/lib/experience/types";
import {
  Check,
  Copy,
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
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";

function formatIssuedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    });
  } catch {
    return iso;
  }
}

export function IssuedCertificateDocument({
  certificate,
  showActions = true,
  defaultPhone = null,
}: {
  certificate: PublicIssuedCertificate;
  showActions?: boolean;
  defaultPhone?: string | null;
}) {
  const searchParams = useSearchParams();
  const verifyUrl = useMemo(
    () => getCertificatePublicUrl(certificate.folio),
    [certificate.folio],
  );
  const validateHub = useMemo(() => getCertificateValidateHubUrl(), []);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyDeliver, setBusyDeliver] = useState(false);
  const snap = certificate.snapshot;
  const isActive = certificate.status === "active";
  const name = certificate.holder_full_name;

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#0b1f33", light: "#ffffff" },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [verifyUrl]);

  // Acciones automáticas tras emitir (?print=1&wa=1&mail=1)
  useEffect(() => {
    if (!showActions || !isActive) return;
    const print = searchParams.get("print") === "1";
    const wa = searchParams.get("wa") === "1";
    const mail = searchParams.get("mail") === "1";

    if (wa) {
      window.open(
        buildCertificateWhatsAppUrl({
          folio: certificate.folio,
          holderName: name,
          title: certificate.title,
          phone: defaultPhone,
        }),
        "_blank",
        "noopener,noreferrer",
      );
    }
    if (mail) {
      window.location.href = buildCertificateMailto({
        folio: certificate.folio,
        holderName: name,
        title: certificate.title,
      });
    }
    if (print) {
      window.setTimeout(() => window.print(), 700);
    }
  }, [
    showActions,
    isActive,
    searchParams,
    certificate.folio,
    certificate.title,
    name,
    defaultPhone,
  ]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setMessage("Enlace de validación copiado.");
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
        title: `Certificado ZOVIT · ${name}`,
        text: `Verifica mi certificado ZOVIT: ${name}`,
        url: verifyUrl,
      });
    } catch {
      // cancelado
    }
  }

  async function resend(channels: { email?: boolean; whatsapp?: boolean }) {
    setBusyDeliver(true);
    setMessage("");
    const response = await fetch("/api/certificates/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folio: certificate.folio,
        email: channels.email === true,
        whatsapp: channels.whatsapp === true,
        toPhone: defaultPhone,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusyDeliver(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo preparar el envío.");
      return;
    }
    if (channels.whatsapp && data.deepLinks?.whatsapp) {
      window.open(data.deepLinks.whatsapp, "_blank", "noopener,noreferrer");
    }
    if (channels.email) {
      if (data.emailSent) {
        setMessage("Correo enviado a tu bandeja.");
      } else if (data.deepLinks?.mailto) {
        window.location.href = data.deepLinks.mailto;
      }
    }
  }

  return (
    <div className="issuedCertPage">
      {!isActive && (
        <div className="issuedCertBanner no-print">
          Este certificado está <strong>{certificate.status}</strong>
          {certificate.revoke_reason ? `: ${certificate.revoke_reason}` : "."}
        </div>
      )}

      <article className={`issuedCertDoc ${isActive ? "" : "isInactive"}`}>
        <div className="issuedCertFrame">
          <header className="issuedCertHeader">
            <div>
              <p className="issuedCertBrand">ZOVIT</p>
              <p className="issuedCertLegal">Plataforma de servicios verificados · Chile</p>
            </div>
            <div className="issuedCertSeal">
              <ShieldCheck size={28} />
              <span>Emitido digitalmente</span>
            </div>
          </header>

          <p className="issuedCertKicker">CERTIFICADO OFICIAL</p>
          <h1 className="issuedCertTitle">Certificado de Experiencia Profesional</h1>

          <p className="issuedCertLead">
            Certificamos que, conforme a los registros de la plataforma ZOVIT y a la verificación
            de identidad realizada, se acredita a:
          </p>

          <p className="issuedCertName">{name}</p>
          <p className="issuedCertRut">RUT {certificate.holder_rut_masked ?? "******-*"}</p>

          <p className="issuedCertGrant">el reconocimiento de:</p>
          <p className="issuedCertAward">{certificate.title}</p>

          <dl className="issuedCertMeta">
            <div>
              <dt>Trabajos verificados</dt>
              <dd>{snap?.completedJobs ?? 0}</dd>
            </div>
            <div>
              <dt>Horas registradas</dt>
              <dd>{formatHours(snap?.totalHours ?? 0)}</dd>
            </div>
            <div>
              <dt>Valoración</dt>
              <dd>
                {snap?.ratingCount
                  ? `${snap.averageRating.toFixed(1)} (${snap.ratingCount})`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Nivel</dt>
              <dd>{snap?.experienceLevel ?? "—"}</dd>
            </div>
          </dl>

          {(snap?.topCategories?.length ?? 0) > 0 && (
            <p className="issuedCertCategories">Áreas: {snap.topCategories.join(" · ")}</p>
          )}

          <footer className="issuedCertFooter">
            <div>
              <p>Santiago (Chile), {formatIssuedDate(certificate.issued_at)}</p>
              <p>
                <strong>ID Certificado:</strong> {certificate.folio}
              </p>
              <p className="issuedCertHint">
                Asegúrese de que el código QR le dirija a zovit.cl. Valide siempre el ID en{" "}
                {validateHub.replace("https://", "")}.
              </p>
            </div>
            <div className="issuedCertQrBlock">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR validación ${certificate.folio}`}
                  width={140}
                  height={140}
                />
              ) : (
                <div className="issuedCertQrPlaceholder">
                  <QrCode size={36} />
                </div>
              )}
              <span>Escanear para validar</span>
            </div>
          </footer>
        </div>
      </article>

      {showActions && (
        <div className="issuedCertActions no-print">
          <button type="button" className="primaryButton" onClick={() => window.print()}>
            <Printer size={18} /> Imprimir / Guardar PDF
          </button>
          <button
            type="button"
            className="secondaryButton"
            disabled={busyDeliver}
            onClick={() => void resend({ email: true })}
          >
            <Mail size={18} /> Enviar correo
          </button>
          <button
            type="button"
            className="secondaryButton"
            disabled={busyDeliver}
            onClick={() => void resend({ whatsapp: true })}
          >
            <MessageCircle size={18} /> WhatsApp
          </button>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => {
              window.location.href = buildCertificateSmsUrl({
                folio: certificate.folio,
                holderName: name,
                title: certificate.title,
              });
            }}
          >
            <Smartphone size={18} /> SMS
          </button>
          <button
            type="button"
            className="secondaryButton"
            onClick={() =>
              window.open(
                buildCertificateLinkedInUrl(certificate.folio),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <Linkedin size={18} /> LinkedIn
          </button>
          <button
            type="button"
            className="secondaryButton"
            onClick={() =>
              window.open(
                buildCertificateTelegramUrl({ folio: certificate.folio, holderName: name }),
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <Send size={18} /> Telegram
          </button>
          <button type="button" className="secondaryButton" onClick={() => void copyLink()}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
          {"share" in navigator && (
            <button type="button" className="secondaryButton" onClick={() => void shareNative()}>
              <Share2 size={18} /> Más opciones
            </button>
          )}
          {message && <p className="muted" style={{ width: "100%", textAlign: "center" }}>{message}</p>}
        </div>
      )}
    </div>
  );
}
