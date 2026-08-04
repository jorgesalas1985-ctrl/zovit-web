import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverIssuedCertificate } from "@/lib/certificates/deliverCertificate";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as {
      folio?: string;
      email?: boolean;
      whatsapp?: boolean;
      print?: boolean;
      toEmail?: string;
      toPhone?: string;
    };

    if (!body.folio?.trim()) {
      return NextResponse.json({ error: "Falta el folio del certificado." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: cert, error } = await admin
      .from("issued_certificates")
      .select("folio,profile_id,holder_full_name,title,status")
      .eq("folio", body.folio.trim().toUpperCase())
      .maybeSingle();

    if (error || !cert) {
      return NextResponse.json({ error: "Certificado no encontrado." }, { status: 404 });
    }

    if (cert.profile_id !== auth.user.id && auth.profile.role !== "admin") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    if (cert.status !== "active") {
      return NextResponse.json({ error: "Solo se pueden enviar certificados vigentes." }, { status: 400 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", cert.profile_id)
      .maybeSingle();

    const delivery = await deliverIssuedCertificate({
      profileId: cert.profile_id,
      folio: cert.folio,
      holderName: cert.holder_full_name,
      title: cert.title,
      channels: {
        email: body.email !== false,
        whatsapp: body.whatsapp === true,
        print: body.print === true,
      },
      toEmail: body.toEmail?.trim() || auth.user.email || null,
      toPhone: body.toPhone?.trim() || profile?.phone || null,
    });

    return NextResponse.json({ ok: true, ...delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
