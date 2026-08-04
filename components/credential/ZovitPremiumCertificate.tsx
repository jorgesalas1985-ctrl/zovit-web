"use client";

import { getCertificatePublicUrl, getCertificateValidateHubUrl } from "@/lib/certificates/url";
import { getCredentialPublicUrl } from "@/lib/credential/url";
import type { PublicIssuedCertificate } from "@/lib/certificates/types";
import { formatHours } from "@/lib/experience/types";
import { QrCode, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

function formatIssuedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    });
  } catch {
    return iso;
  }
}

type ZovitPremiumCertificateProps = {
  certificate: PublicIssuedCertificate;
  /** Si el folio es LIVE, el QR apunta a la credencial pública. */
  livePreview?: boolean;
};

export function ZovitPremiumCertificate({
  certificate,
  livePreview = false,
}: ZovitPremiumCertificateProps) {
  const verifyUrl = useMemo(() => {
    if (livePreview || certificate.folio.startsWith("ZV-LIVE-")) {
      return getCredentialPublicUrl(certificate.profile_id);
    }
    return getCertificatePublicUrl(certificate.folio);
  }, [certificate.folio, certificate.profile_id, livePreview]);

  const validateHub = useMemo(() => getCertificateValidateHubUrl(), []);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const snap = certificate.snapshot;
  const name = certificate.holder_full_name;

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(verifyUrl, {
      width: 160,
      margin: 1,
      color: { dark: "#0b1f33", light: "#ffffff" },
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [verifyUrl]);

  return (
    <article className="zovitPremiumDoc" data-doc="certificate">
      <div className="zovitPremiumFrame">
        <header className="zovitPremiumHeader">
          <div>
            <p className="zovitPremiumBrand">ZOVIT</p>
            <p className="zovitPremiumLegal">
              Plataforma de servicios verificados · Chile
            </p>
            <p className="zovitPremiumLegal">
              Identidad biométrica y experiencia laboral certificada
            </p>
          </div>
          <div className="zovitPremiumSeal">
            <ShieldCheck size={26} />
            <span>Firma digital ZOVIT</span>
          </div>
        </header>

        <p className="zovitPremiumKicker">CERTIFICADO OFICIAL</p>
        <h1 className="zovitPremiumTitle">Certificado de Experiencia Profesional</h1>

        <p className="zovitPremiumLead">
          Certificamos que, conforme a los registros de la plataforma ZOVIT y a la verificación de
          identidad realizada, se acredita a:
        </p>

        <p className="zovitPremiumName">{name}</p>
        <p className="zovitPremiumRut">RUT {certificate.holder_rut_masked ?? "******-*"}</p>

        <p className="zovitPremiumGrant">el reconocimiento de:</p>
        <p className="zovitPremiumAward">{certificate.title}</p>

        <dl className="zovitPremiumMeta">
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
                ? `${Number(snap.averageRating).toFixed(1)} (${snap.ratingCount})`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Nivel</dt>
            <dd>{snap?.experienceLevel ?? "—"}</dd>
          </div>
        </dl>

        <footer className="zovitPremiumFooter">
          <div>
            <p>Santiago (Chile), {formatIssuedDate(certificate.issued_at)}</p>
            <p>
              <strong>ID Certificado:</strong> {certificate.folio}
            </p>
            <p className="zovitPremiumHint">
              Asegúrese de que el código QR le dirija a zovit.cl. Valide siempre el ID en{" "}
              {validateHub.replace(/^https?:\/\//, "")}.
            </p>
          </div>
          <div className="zovitPremiumQr">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR ${certificate.folio}`} width={140} height={140} />
            ) : (
              <div className="zovitPremiumQrPlaceholder">
                <QrCode size={36} />
              </div>
            )}
            <span>Escanear para validar</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
