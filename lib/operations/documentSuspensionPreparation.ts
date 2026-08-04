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
    (profile) => profile.compliance.status === "suspension_ready",
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

  const existingResult = await loadExistingSuspensionEvents(input.supabase, {
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
    buildSuspensionEvent(profile, input.actorId, input.actorType),
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

async function loadExistingSuspensionEvents(
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
    .eq("event_type", "semester_suspension_ready")
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
