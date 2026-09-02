import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadDocumentComplianceDashboard,
  getDocumentComplianceCursor,
  advanceDocumentComplianceCursor,
  type DocumentComplianceDashboard,
  type DocumentComplianceProfile,
} from "@/lib/operations/documentComplianceDashboard";
import {
  buildOperationalDocumentEventInsert,
  type OperationalDocumentActorType,
} from "@/lib/operations/documentRenewalPersistence";

export type DocumentSuspensionPreparationResult = {
  checked: number;
  prepared: number;
  skipped: number;
  eventIds: string[];
  error: string | null;
  summary: string;
};

export async function prepareDocumentSuspensionEvents(input: {
  supabase: SupabaseClient;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  limit?: number;
  dashboard?: DocumentComplianceDashboard;
}): Promise<DocumentSuspensionPreparationResult> {
  const cursor = input.dashboard ? null : await getDocumentComplianceCursor(input.supabase, "document_suspensions");
  const dashboard =
    input.dashboard ??
    (await loadDocumentComplianceDashboard(input.supabase, { limit: input.limit ?? 50, cursor }));

  if (dashboard.error) {
    return buildResult({
      checked: 0,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: dashboard.error,
    });
  }

  const candidates = dashboard.profiles.filter(
    (profile) => profile.compliance.status === "suspension_ready",
  );

  if (!candidates.length) {
    if (!input.dashboard) await advanceDocumentComplianceCursor(input.supabase, "document_suspensions", dashboard.nextCursor ?? null);
    return buildResult({
      checked: dashboard.totalProfiles,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: null,
    });
  }

  const events = candidates.map((profile) =>
    buildSuspensionEvent(profile, input.actorId, input.actorType),
  );
  const persisted = await persistSemesterEvents(input.supabase, events);
  if (persisted.error) return buildResult({ checked: dashboard.totalProfiles, prepared: 0, skipped: 0, eventIds: [], error: persisted.error });
  if (!input.dashboard) await advanceDocumentComplianceCursor(input.supabase, "document_suspensions", dashboard.nextCursor ?? null);

  return buildResult({
    checked: dashboard.totalProfiles,
    prepared: persisted.created,
    skipped: candidates.length - persisted.created,
    eventIds: persisted.eventIds,
    error: null,
  });
}

function buildSuspensionEvent(
  profile: DocumentComplianceProfile,
  actorId?: string | null,
  actorType?: OperationalDocumentActorType,
) {
  return buildOperationalDocumentEventInsert({
    profileId: profile.profileId,
    eventType: "semester_suspension_ready",
    actorId,
    actorType: actorType ?? "operations",
    semesterYear: profile.compliance.period.year,
    semester: profile.compliance.period.code,
    summary: "Perfil listo para suspension documental semestral.",
    metadata: {
      displayName: profile.displayName,
      status: profile.compliance.status,
      missingKinds: profile.compliance.missingKinds,
      pendingKinds: profile.compliance.pendingKinds,
      rejectedKinds: profile.compliance.rejectedKinds,
      expiredKinds: profile.compliance.expiredKinds,
      deadlineAt: profile.compliance.deadlineAt,
      reasons: profile.compliance.reasons,
    },
  });
}

async function persistSemesterEvents(supabase: SupabaseClient, events: ReturnType<typeof buildSuspensionEvent>[]) {
  const eventIds: string[] = []; let created = 0;
  for (const event of events) {
    const { data, error } = await supabase.rpc("intranet_create_semester_document_event", {
      p_profile_id: event.profile_id, p_event_type: event.event_type, p_semester_year: event.semester_year,
      p_semester: event.semester, p_actor_id: event.actor_id ?? null, p_actor_type: event.actor_type,
      p_summary: event.summary, p_metadata: event.metadata,
    });
    if (error) return { created: 0, eventIds: [], error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.event_id) eventIds.push(row.event_id as string);
    if (row?.created) created += 1;
  }
  return { created, eventIds, error: null };
}

function buildResult(
  input: Omit<DocumentSuspensionPreparationResult, "summary">,
): DocumentSuspensionPreparationResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(input: Omit<DocumentSuspensionPreparationResult, "summary">): string {
  if (input.error) return `No se pudo preparar suspension documental: ${input.error}`;
  if (input.prepared > 0) {
    return `${input.prepared} eventos de suspension documental quedaron preparados.`;
  }
  if (input.skipped > 0) {
    return `${input.skipped} eventos de suspension documental ya estaban preparados.`;
  }
  return "No hay perfiles listos para suspension documental.";
}
