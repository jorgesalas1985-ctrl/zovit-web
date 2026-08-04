import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCertificateMailto,
  buildCertificateWhatsAppUrl,
  sendCertificateEmailViaResend,
  type CertificateDeliveryChannels,
} from "@/lib/certificates/delivery";
import { getCertificatePublicUrl } from "@/lib/certificates/url";

export type CertificateDeliveryResult = {
  emailSent: boolean;
  emailReason?: string;
  whatsappReady: boolean;
  notificationCreated: boolean;
  deepLinks: {
    mailto: string;
    whatsapp: string;
    publicUrl: string;
  };
};

export async function deliverIssuedCertificate(params: {
  profileId: string;
  folio: string;
  holderName: string;
  title: string;
  channels: CertificateDeliveryChannels;
  toEmail?: string | null;
  toPhone?: string | null;
}): Promise<CertificateDeliveryResult> {
  const admin = createAdminClient();
  const publicUrl = getCertificatePublicUrl(params.folio);
  const mailto = buildCertificateMailto({
    folio: params.folio,
    holderName: params.holderName,
    toEmail: params.toEmail,
    title: params.title,
  });
  const whatsapp = buildCertificateWhatsAppUrl({
    folio: params.folio,
    holderName: params.holderName,
    title: params.title,
    phone: params.toPhone,
  });

  let emailSent = false;
  let emailReason: string | undefined;
  let whatsappReady = false;
  let notificationCreated = false;

  if (params.channels.email && params.toEmail?.trim()) {
    const result = await sendCertificateEmailViaResend({
      toEmail: params.toEmail.trim(),
      folio: params.folio,
      holderName: params.holderName,
      title: params.title,
    });
    emailSent = result.sent;
    emailReason = result.reason;
  }

  if (params.channels.whatsapp) {
    whatsappReady = true;
  }

  try {
    const parts: string[] = [];
    if (params.channels.email) {
      parts.push(
        emailSent
          ? `Correo enviado a ${params.toEmail}`
          : `Correo listo para enviar (${params.toEmail || "tu bandeja"})`,
      );
    }
    if (params.channels.whatsapp) {
      parts.push("WhatsApp listo para compartir el enlace de validación");
    }
    if (params.channels.print) {
      parts.push("Puedes imprimir o guardar PDF desde la página del certificado");
    }

    await admin.from("notifications").insert({
      user_id: params.profileId,
      title: "Certificado ZOVIT listo",
      body:
        parts.length > 0
          ? `${parts.join(". ")}. ID ${params.folio}. ${publicUrl}`
          : `Tu certificado ${params.folio} está listo: ${publicUrl}`,
    });
    notificationCreated = true;
  } catch {
    notificationCreated = false;
  }

  return {
    emailSent,
    emailReason,
    whatsappReady,
    notificationCreated,
    deepLinks: { mailto, whatsapp, publicUrl },
  };
}
