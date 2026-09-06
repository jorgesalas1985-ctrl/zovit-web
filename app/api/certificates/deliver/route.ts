import { deliverIssuedCertificate } from "@/lib/certificates/deliverCertificate";
import { parseCertificateEmailDeliveryRequest } from "@/lib/certificates/deliveryRequest";
import { assertSameOrigin, csrfDeniedResponse } from "@/lib/security/csrf";
import { clientIpFromRequest, rateLimit, rateLimitResponse } from "@/lib/security/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type DeliveryRow = {
  id: string;
  certificate_id: string;
  status: "processing" | "sent" | "failed";
};

async function ensureDeliveryNotification(input: {
  deliveryId: string;
  profileId: string;
  folio: string;
}) {
  const admin = createAdminClient();
  return admin.from("notifications").upsert(
    {
      user_id: input.profileId,
      title: "Certificado ZOVIT listo",
      body: `Correo del certificado enviado. ID ${input.folio}.`,
      certificate_email_delivery_id: input.deliveryId,
    },
    { onConflict: "certificate_email_delivery_id", ignoreDuplicates: true },
  );
}

function processingResponse() {
  return NextResponse.json(
    { emailSent: false, status: "processing" },
    { status: 202 },
  );
}

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (!csrf.ok) return csrfDeniedResponse(csrf.error);

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authError ? null : authData.user;
    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = parseCertificateEmailDeliveryRequest(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json({ error: "Solicitud de entrega inválida." }, { status: 400 });
    }
    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Tu cuenta necesita un correo verificado para recibir el certificado." },
        { status: 409 },
      );
    }

    const limited = rateLimit(
      `certificate:deliver:${user.id}:${clientIpFromRequest(request)}`,
      { limit: 4, windowMs: 60_000 },
    );
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const admin = createAdminClient();
    const { data: certificate, error: certificateError } = await admin
      .from("issued_certificates")
      .select("id,folio,profile_id,status,title,holder_full_name")
      .eq("folio", body.folio)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (certificateError) {
      return NextResponse.json({ error: "No se pudo preparar el envío." }, { status: 500 });
    }
    if (!certificate) {
      // No distinguir entre un folio inexistente y uno que no pertenece al usuario.
      return NextResponse.json({ error: "Certificado no disponible." }, { status: 404 });
    }
    if (certificate.status !== "active") {
      return NextResponse.json({ error: "El certificado no está activo." }, { status: 409 });
    }

    const timestamp = new Date().toISOString();
    let delivery: DeliveryRow | null = null;
    const { data: inserted, error: insertError } = await admin
      .from("certificate_email_deliveries")
      .insert({
        certificate_id: certificate.id,
        profile_id: user.id,
        idempotency_key: body.idempotencyKey,
        recipient_email: user.email.trim(),
        status: "processing",
        updated_at: timestamp,
      })
      .select("id,certificate_id,status")
      .maybeSingle();

    if (!insertError && inserted) {
      delivery = inserted as DeliveryRow;
    } else if (insertError?.code === "23505") {
      const { data: existing, error: existingError } = await admin
        .from("certificate_email_deliveries")
        .select("id,certificate_id,status")
        .eq("profile_id", user.id)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();
      if (existingError || !existing) {
        return NextResponse.json({ error: "No se pudo preparar el envío." }, { status: 500 });
      }

      const previous = existing as DeliveryRow;
      if (previous.certificate_id !== certificate.id) {
        return NextResponse.json({ error: "La solicitud de entrega no coincide." }, { status: 409 });
      }
      if (previous.status === "sent") {
        await ensureDeliveryNotification({
          deliveryId: previous.id,
          profileId: user.id,
          folio: certificate.folio,
        });
        return NextResponse.json({ emailSent: true });
      }
      if (previous.status === "processing") return processingResponse();

      const { data: retried, error: retryError } = await admin
        .from("certificate_email_deliveries")
        .update({ status: "processing", updated_at: timestamp })
        .eq("id", previous.id)
        .eq("status", "failed")
        .select("id,certificate_id,status")
        .maybeSingle();
      if (retryError) {
        return NextResponse.json({ error: "No se pudo preparar el envío." }, { status: 500 });
      }
      if (!retried) return processingResponse();
      delivery = retried as DeliveryRow;
    } else {
      return NextResponse.json({ error: "No se pudo preparar el envío." }, { status: 500 });
    }

    try {
      const result = await deliverIssuedCertificate({
        profileId: user.id,
        folio: certificate.folio,
        holderName: certificate.holder_full_name,
        title: certificate.title,
        channels: { email: true },
        toEmail: user.email.trim(),
        idempotencyKey: body.idempotencyKey,
        createNotification: false,
      });
      if (!result.emailSent) {
        await admin
          .from("certificate_email_deliveries")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", delivery.id)
          .eq("status", "processing");
        return NextResponse.json({ error: "No se pudo enviar el correo." }, { status: 502 });
      }

      const { data: markedSent, error: sentUpdateError } = await admin
        .from("certificate_email_deliveries")
        .update({
          status: "sent",
          provider_message_id: result.providerMessageId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
        .eq("status", "processing")
        .select("id")
        .maybeSingle();
      if (sentUpdateError || !markedSent) return processingResponse();

      await ensureDeliveryNotification({
        deliveryId: delivery.id,
        profileId: user.id,
        folio: certificate.folio,
      });
      return NextResponse.json({ emailSent: true });
    } catch {
      // No se sabe si el proveedor aceptó la petición: conservar processing evita un segundo envío.
      return NextResponse.json({ error: "No se pudo confirmar el envío." }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "No se pudo preparar el envío." }, { status: 500 });
  }
}
