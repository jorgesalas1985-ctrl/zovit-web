import { NextResponse } from "next/server";
import { applySuperAdminTourProfile, readTourAccountFromCookie } from "@/lib/auth/applyTourProfile";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureStudentTraining } from "@/lib/worker/classify";
import { createEmptyWorkerDraft, normalizeWorkerDraft } from "@/lib/worker/draft";
import { buildWorkerProfileCompletion } from "@/lib/worker/profileCompletion";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";
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

    const tour = readTourAccountFromCookie(request.headers.get("cookie"));
    const { data: authProfile } = await auth.supabase
      .from("profiles")
      .select("role, account_kind, intranet_role, can_act_as_client, can_act_as_professional, active_mode")
      .eq("id", auth.user.id)
      .maybeSingle();
    const effective = applySuperAdminTourProfile(
      {
        role: (authProfile?.role as "client" | "professional" | "admin") ?? "client",
        account_kind: (authProfile?.account_kind as string | null) ?? null,
        can_act_as_client: Boolean(authProfile?.can_act_as_client),
        can_act_as_professional: Boolean(authProfile?.can_act_as_professional),
        active_mode: authProfile?.active_mode === "professional" ? "professional" : "client",
        intranet_role: (authProfile?.intranet_role as string | null) ?? null,
      },
      tour,
    );
    const { data: registration } = await auth.supabase
      .from("worker_registrations")
      .select("draft")
      .eq("profile_id", auth.user.id)
      .maybeSingle();
    const draft = normalizeWorkerDraft(
      ensureStudentTraining(
        (registration?.draft as WorkerRegistrationDraft | undefined) ?? createEmptyWorkerDraft(),
        effective?.account_kind === "student",
      ),
    );
    const completion = buildWorkerProfileCompletion({
      draft,
      isStudent: effective?.account_kind === "student",
    });
    if (!completion.certificateUnlocked) {
      return NextResponse.json(
        {
          error: `El certificado está cerrado hasta completar el 100% del perfil. Falta: ${completion.missingDocumentLabel}.`,
          missingDocumentLabel: completion.missingDocumentLabel,
          remainingPercent: completion.remainingPercent,
        },
        { status: 403 },
      );
    }

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
