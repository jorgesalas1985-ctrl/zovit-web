import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverIssuedCertificate } from "@/lib/certificates/deliverCertificate";
import {
  issueExperienceCertificate,
  reissueExperienceCertificate,
} from "@/lib/certificates/issueCertificate";
import { isCertificateIssuanceFree, getCertificatePriceClp } from "@/lib/certificates/pricing";
import { getCertificatePublicUrl } from "@/lib/certificates/url";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const admin = createAdminClient();
    const [{ data, error }, { data: profile }] = await Promise.all([
      admin
        .from("issued_certificates")
        .select("*")
        .eq("profile_id", auth.user.id)
        .order("issued_at", { ascending: false })
        .limit(20),
      admin.from("profiles").select("phone").eq("id", auth.user.id).maybeSingle(),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      certificates: data ?? [],
      pricing: {
        priceClp: getCertificatePriceClp(),
        free: isCertificateIssuanceFree(),
      },
      contact: {
        email: auth.user.email ?? null,
        phone: profile?.phone ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as {
      reissue?: boolean;
      deliverEmail?: boolean;
      deliverWhatsapp?: boolean;
      printAfter?: boolean;
      toEmail?: string;
      toPhone?: string;
    };

    const result = body.reissue
      ? await reissueExperienceCertificate(auth.user.id)
      : await issueExperienceCertificate(auth.user.id);

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", auth.user.id)
      .maybeSingle();

    const wantEmail = body.deliverEmail !== false;
    const wantWhatsapp = body.deliverWhatsapp === true;
    const wantPrint = body.printAfter === true;

    const delivery = await deliverIssuedCertificate({
      profileId: auth.user.id,
      folio: result.certificate.folio,
      holderName: result.certificate.holder_full_name,
      title: result.certificate.title,
      channels: {
        email: wantEmail,
        whatsapp: wantWhatsapp,
        print: wantPrint,
      },
      toEmail: body.toEmail?.trim() || auth.user.email || null,
      toPhone: body.toPhone?.trim() || profile?.phone || null,
    });

    const publicUrl = getCertificatePublicUrl(result.certificate.folio);
    const qs = new URLSearchParams();
    if (wantPrint) qs.set("print", "1");
    if (wantWhatsapp) qs.set("wa", "1");
    if (wantEmail && !delivery.emailSent) qs.set("mail", "1");
    const publicUrlWithActions = qs.toString() ? `${publicUrl}?${qs}` : publicUrl;

    return NextResponse.json({
      ok: true,
      reused: result.reused,
      paymentRequired: result.paymentRequired,
      certificate: result.certificate,
      publicUrl: publicUrlWithActions,
      delivery,
      pricing: {
        priceClp: getCertificatePriceClp(),
        free: isCertificateIssuanceFree(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
