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

export type DocumentRenewalReminderPreparationResult = {
  checked: number;
  prepared: number;
  skipped: number;
  eventIds: string[];
  error: string | null;
  summary: string;
};

export async function prepareDocumentRenewalReminderEvents(input: {
  supabase: SupabaseClient;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  limit?: number;
  dashboard?: DocumentComplianceDashboard;
}): Promise<DocumentRenewalReminderPreparationResult> {
  const cursor = input.dashboard ? null : await getDocumentComplianceCursor(input.supabase, "document_reminders");
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
    (profile) => profile.compliance.status === "due_soon",
  );

  if (!candidates.length) {
    if (!input.dashboard) await advanceDocumentComplianceCursor(input.supabase, "document_reminders", dashboard.nextCursor ?? null);
    return buildResult({
      checked: dashboard.totalProfiles,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: null,
    });
  }

  const events = candidates.map((profile) =>
    buildReminderEvent(profile, input.actorId, input.actorType),
  );
  const persisted = await persistSemesterEvents(input.supabase, events);
  if (persisted.error) return buildResult({ checked: dashboard.totalProfiles, prepared: 0, skipped: 0, eventIds: [], error: persisted.error });
  if (!input.dashboard) await advanceDocumentComplianceCursor(input.supabase, "document_reminders", dashboard.nextCursor ?? null);

  return buildResult({
    checked: dashboard.totalProfiles,
    prepared: persisted.created,
    skipped: candidates.length - persisted.created,
    eventIds: persisted.eventIds,
    error: null,
  });
}

function buildReminderEvent(
  profile: DocumentComplianceProfile,
  actorId?: string | null,
  actorType?: OperationalDocumentActorType,
) {
  return buildOperationalDocumentEventInsert({
    profileId: profile.profileId,
    eventType: "semester_renewal_reminder",
    actorId,
    actorType: actorType ?? "operations",
    semesterYear: profile.compliance.period.year,
    semester: profile.compliance.period.code,
    summary: "Recordatorio de renovacion documental semestral preparado.",
    metadata: {
      displayName: profile.displayName,
      status: profile.compliance.status,
      missingKinds: profile.compliance.missingKinds,
      pendingKinds: profile.compliance.pendingKinds,
      deadlineAt: profile.compliance.deadlineAt,
      daysUntilDeadline: profile.compliance.daysUntilDeadline,
      reasons: profile.compliance.reasons,
    },
  });
}

async function persistSemesterEvents(supabase: SupabaseClient, events: ReturnType<typeof buildReminderEvent>[]) {
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
  input: Omit<DocumentRenewalReminderPreparationResult, "summary">,
): DocumentRenewalReminderPreparationResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(
  input: Omit<DocumentRenewalReminderPreparationResult, "summary">,
): string {
  if (input.error) return `No se pudo preparar recordatorio documental: ${input.error}`;
  if (input.prepared > 0) {
    return `${input.prepared} recordatorios documentales quedaron preparados.`;
  }
  if (input.skipped > 0) {
    return `${input.skipped} recordatorios documentales ya estaban preparados.`;
  }
  return "No hay perfiles con recordatorio documental pendiente.";
}
