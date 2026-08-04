import { getCertificatePublicUrl, getCertificateValidateHubUrl } from "@/lib/certificates/url";

export type CertificateDeliveryChannels = {
  email?: boolean;
  whatsapp?: boolean;
  print?: boolean;
};

export function buildCertificateShareText(input: {
  folio: string;
  holderName: string;
  title?: string;
}): string {
  const url = getCertificatePublicUrl(input.folio);
  return [
    `Certificado ZOVIT · ${input.holderName}`,
    input.title ? input.title : "Experiencia profesional verificable",
    `ID: ${input.folio}`,
    `Valida aquí: ${url}`,
    `También en: ${getCertificateValidateHubUrl()}`,
  ].join("\n");
}

export function buildCertificateMailto(input: {
  folio: string;
  holderName: string;
  toEmail?: string | null;
  title?: string;
}): string {
  const url = getCertificatePublicUrl(input.folio);
  const subject = encodeURIComponent(`Certificado ZOVIT · ${input.holderName} · ${input.folio}`);
  const body = encodeURIComponent(
    [
      "Hola,",
      "",
      `Te comparto mi Certificado de Experiencia Profesional ZOVIT.`,
      "",
      `Titular: ${input.holderName}`,
      input.title ? `Reconocimiento: ${input.title}` : null,
      `ID Certificado: ${input.folio}`,
      `Validar / ver documento: ${url}`,
      "",
      "Puedes escanear el código QR del certificado o abrir el enlace. El documento es emitido por ZOVIT y se puede comprobar en línea.",
      "",
      `— ${input.holderName}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const to = input.toEmail?.trim() ? encodeURIComponent(input.toEmail.trim()) : "";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/** Normaliza teléfono Chile a formato internacional sin + para wa.me */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("56") && digits.length >= 11) return digits;
  if (digits.startsWith("9") && digits.length === 9) return `56${digits}`;
  if (digits.length === 8) return `569${digits}`;
  if (digits.length >= 10) return digits;
  return null;
}

export function buildCertificateWhatsAppUrl(input: {
  folio: string;
  holderName: string;
  title?: string;
  phone?: string | null;
}): string {
  const text = buildCertificateShareText(input);
  const phone = normalizeWhatsAppPhone(input.phone ?? null);
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function buildCertificateSmsUrl(input: {
  folio: string;
  holderName: string;
  title?: string;
}): string {
  return `sms:?&body=${encodeURIComponent(buildCertificateShareText(input))}`;
}

export function buildCertificateLinkedInUrl(folio: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    getCertificatePublicUrl(folio),
  )}`;
}

export function buildCertificateTelegramUrl(input: {
  folio: string;
  holderName: string;
}): string {
  const url = getCertificatePublicUrl(input.folio);
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
    `Certificado ZOVIT · ${input.holderName}`,
  )}`;
}

export async function sendCertificateEmailViaResend(input: {
  toEmail: string;
  folio: string;
  holderName: string;
  title: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY ausente" };
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.CERTIFICATE_EMAIL_FROM?.trim() ||
    "ZOVIT <onboarding@resend.dev>";
  const url = getCertificatePublicUrl(input.folio);
  const validate = getCertificateValidateHubUrl();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.toEmail],
      subject: `Tu certificado ZOVIT ${input.folio}`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0b1f33">
          <h1 style="font-size:20px;margin:0 0 12px">Tu certificado ZOVIT está listo</h1>
          <p>Hola <strong>${escapeHtml(input.holderName)}</strong>,</p>
          <p>Emitimos tu <strong>Certificado de Experiencia Profesional</strong>.</p>
          <p>
            <strong>Reconocimiento:</strong> ${escapeHtml(input.title)}<br/>
            <strong>ID:</strong> ${escapeHtml(input.folio)}
          </p>
          <p>
            <a href="${url}" style="display:inline-block;background:#0e7490;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
              Ver / imprimir certificado
            </a>
          </p>
          <p style="font-size:13px;color:#475569">
            Valida el folio en <a href="${validate}">${validate.replace("https://", "")}</a>
          </p>
        </div>
      `,
      text: [
        `Tu certificado ZOVIT está listo`,
        `Titular: ${input.holderName}`,
        `Reconocimiento: ${input.title}`,
        `ID: ${input.folio}`,
        `Ver: ${url}`,
        `Validar: ${validate}`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return { sent: false, reason: err.slice(0, 240) };
  }

  return { sent: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
