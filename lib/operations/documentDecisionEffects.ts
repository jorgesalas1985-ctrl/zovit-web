import type { SupabaseClient } from "@supabase/supabase-js";

import { closeResolvedDocumentNotifications } from "@/lib/operations/documentNotificationCleanup";
import type { DocumentSemesterComplianceStatus } from "@/lib/operations/documentSemesterCompliance";
import { loadOwnDocumentCompliance } from "@/lib/operations/ownDocumentCompliance";
import {
  buildOperationalDocumentEventInsert,
  type OperationalDocumentActorType,
} from "@/lib/operations/documentRenewalPersistence";

export type DocumentDecisionEffectsResult = {
  complianceStatus: DocumentSemesterComplianceStatus | null;
  notificationsClosed: number;
  eventId: string | null;
  error: string | null;
  summary: string;
};

export async function runDocumentDecisionEffects(input: {
  supabase: SupabaseClient;
  profileId: string | null;
  documentId?: string | null;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
}): Promise<DocumentDecisionEffectsResult> {
  if (!input.profileId) {
    return buildResult({
      complianceStatus: null,
      notificationsClosed: 0,
      eventId: null,
      error: "Decision documental sin perfil asociado.",
    });
  }

  try {
    const compliance = await loadOwnDocumentCompliance({
      supabase: input.supabase,
      profileId: input.profileId,
    });

    if (compliance.error) {
      return buildResult({
        complianceStatus: compliance.compliance.status,
        notificationsClosed: 0,
        eventId: await registerSyncFailureEvent({
          ...input,
          error: compliance.error,
          semesterYear: compliance.compliance.period.year,
          semester: compliance.compliance.period.code,
        }),
        error: compliance.error,
      });
    }

    const cleanup = await closeResolvedDocumentNotifications({
      supabase: input.supabase,
      profileId: input.profileId,
      status: compliance.compliance.status,
      semesterYear: compliance.compliance.period.year,
      semester: compliance.compliance.period.code,
    });

    return buildResult({
      complianceStatus: compliance.compliance.status,
      notificationsClosed: cleanup.closed,
      eventId: cleanup.error
        ? await registerSyncFailureEvent({
            ...input,
            error: cleanup.error,
            semesterYear: compliance.compliance.period.year,
            semester: compliance.compliance.period.code,
          })
        : null,
      error: cleanup.error,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron ejecutar efectos posteriores a la decision documental.";

    return buildResult({
      complianceStatus: null,
      notificationsClosed: 0,
      eventId: await registerSyncFailureEvent({
        ...input,
        error: message,
      }),
      error: message,
    });
  }
}

function buildResult(
  input: Omit<DocumentDecisionEffectsResult, "summary">,
): DocumentDecisionEffectsResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(input: Omit<DocumentDecisionEffectsResult, "summary">): string {
  if (input.error) return `Efectos posteriores pendientes: ${input.error}`;
  if (input.notificationsClosed > 0) {
    return `${input.notificationsClosed} aviso(s) documental(es) cerrados despues de la decision.`;
  }
  return "Decision documental sincronizada sin avisos por cerrar.";
}

async function registerSyncFailureEvent(input: {
  supabase: SupabaseClient;
  profileId: string | null;
  documentId?: string | null;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  error: string;
  semesterYear?: number;
  semester?: "S1" | "S2";
}): Promise<string | null> {
  if (!input.profileId) return null;

  try {
    const event = buildOperationalDocumentEventInsert({
      documentId: input.documentId ?? null,
      profileId: input.profileId,
      eventType: "post_decision_sync_failed",
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? "system",
      semesterYear: input.semesterYear,
      semester: input.semester,
      summary: "Sincronizacion posterior a decision documental pendiente.",
      metadata: {
        error: input.error,
      },
    });
    const { data, error } = await input.supabase
      .from("operational_document_events")
      .insert(event)
      .select("id")
      .maybeSingle();

    if (error) return null;
    return (data as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}
