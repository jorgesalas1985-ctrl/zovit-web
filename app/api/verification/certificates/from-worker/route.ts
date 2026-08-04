import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { isValidUuid } from "@/lib/security/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  importWorkerCertificatesToStudyVerification,
  listWorkerCertificateSources,
} from "@/lib/verification/importWorkerCertificates";
import { canAccessStudyCertificates } from "@/lib/verification/types";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;
    if (!isValidUuid(auth.user.id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }
    if (!canAccessStudyCertificates(auth.profile.role)) {
      return NextResponse.json({ available: false, documents: [] });
    }

    const admin = createAdminClient();
    const documents = await listWorkerCertificateSources(auth.supabase, admin, auth.user.id);
    return NextResponse.json({
      available: documents.length > 0,
      documents: documents.map((d) => ({ label: d.label, path: d.storagePath })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;
    if (!isValidUuid(auth.user.id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    if (!canAccessStudyCertificates(auth.profile.role)) {
      return NextResponse.json(
        { error: "Solo profesionales pueden enviar certificados de estudios." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const result = await importWorkerCertificatesToStudyVerification({
      supabase: auth.supabase,
      admin,
      userId: auth.user.id,
      submit: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
