import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadDocumentComplianceDashboard,
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
  const dashboard =
    input.dashboard ??
    (await loadDocumentComplianceDashboard(input.supabase, { limit: input.limit ?? 50 }));

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
    return buildResult({
      checked: dashboard.totalProfiles,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: null,
    });
  }

  const existingResult = await loadExistingReminderEvents(input.supabase, {
    profileIds: candidates.map((profile) => profile.profileId),
    year: dashboard.period.year,
    semester: dashboard.period.code,
  });

  if (existingResult.error) {
    return buildResult({
      checked: dashboard.totalProfiles,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: existingResult.error,
    });
  }

  const pending = candidates.filter(
    (profile) => !existingResult.profileIds.has(profile.profileId),
  );

  if (!pending.length) {
    return buildResult({
      checked: dashboard.totalProfiles,
      prepared: 0,
      skipped: candidates.length,
      eventIds: [],
      error: null,
    });
  }

  const events = pending.map((profile) =>
    buildReminderEvent(profile, input.actorId, input.actorType),
  );
  const { data, error } = await input.supabase
    .from("operational_document_events")
    .insert(events)
    .select("id");

  if (error) {
    return buildResult({
      checked: dashboard.totalProfiles,
      prepared: 0,
      skipped: candidates.length - pending.length,
      eventIds: [],
      error: error.message,
    });
  }

  const eventIds = ((data ?? []) as { id?: string }[])
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));

  return buildResult({
    checked: dashboard.totalProfiles,
    prepared: pending.length,
    skipped: candidates.length - pending.length,
    eventIds,
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

async function loadExistingReminderEvents(
  supabase: SupabaseClient,
  input: {
    profileIds: string[];
    year: number;
    semester: "S1" | "S2";
  },
): Promise<{ profileIds: Set<string>; error: string | null }> {
  const { data, error } = await supabase
    .from("operational_document_events")
    .select("profile_id")
    .eq("event_type", "semester_renewal_reminder")
    .eq("semester_year", input.year)
    .eq("semester", input.semester)
    .in("profile_id", input.profileIds);

  if (error) return { profileIds: new Set(), error: error.message };

  return {
    profileIds: new Set(
      ((data ?? []) as { profile_id?: string }[])
        .map((row) => row.profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
    error: null,
  };
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
