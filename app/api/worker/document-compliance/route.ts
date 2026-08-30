import { NextResponse } from "next/server";

import {
  evaluateDocumentSemesterCompliance,
  resolveDocumentCompliancePeriod,
} from "@/lib/operations/documentSemesterCompliance";
import { loadOwnDocumentCompliance } from "@/lib/operations/ownDocumentCompliance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isMissingWorkerTableError,
  loadWorkerDraftFallback,
} from "@/lib/worker/registrationFallback";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

function hasUploadedCredential(draft: WorkerRegistrationDraft | null): boolean {
  if (!draft) return false;

  return Boolean(
    draft.credentials.some((credential) => credential.storagePath) ||
      draft.training.enrollmentStoragePath,
  );
}

async function loadWorkerDraft(userId: string): Promise<WorkerRegistrationDraft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worker_registrations")
    .select("draft")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!error) {
    return (data?.draft as WorkerRegistrationDraft | null | undefined) ?? null;
  }

  if (!isMissingWorkerTableError(error.message)) return null;
  const fallback = await loadWorkerDraftFallback(createAdminClient(), userId);
  return fallback?.draft ?? null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
    }

    const result = await loadOwnDocumentCompliance({
      supabase,
      profileId: authData.user.id,
      // La identidad ya se entrega y revisa en el registro biométrico.
      // Aquí solo queda pendiente el respaldo académico/laboral del perfil trabajador.
      requiredKinds: ["credential"],
    });

    // El registro de trabajador guarda inicialmente los adjuntos en su borrador.
    // Hasta que administración los convierta en documentos operativos, deben contar
    // como entregados y pendientes de revisión, no como "faltantes".
    const draft = await loadWorkerDraft(authData.user.id);
    const draftHasCredential = hasUploadedCredential(draft);
    const credentialIsMissing = result.compliance.missingKinds.includes("credential");

    if (draftHasCredential && credentialIsMissing) {
      const period = resolveDocumentCompliancePeriod();
      const compliance = evaluateDocumentSemesterCompliance({
        requiredKinds: ["credential"],
        documents: [
          {
            documentId: "worker-registration-credential",
            documentKind: "credential",
            status: "submitted",
            semesterYear: period.year,
            semester: period.code,
          },
        ],
      });

      return NextResponse.json({
        compliance,
        actionLabel: "Tu documento fue recibido y está esperando revisión ZOVIT.",
        nextStep: "wait_review",
        error: null,
      });
    }

    return NextResponse.json({
      compliance: result.compliance,
      actionLabel: result.actionLabel,
      nextStep: result.nextStep,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el estado documental." },
      { status: 500 },
    );
  }
}
