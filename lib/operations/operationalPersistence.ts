import type { SupabaseClient } from "@supabase/supabase-js";

import type { CurrentSemesterClosePreview } from "@/lib/operations/currentSemesterClosePreview";
import type { OperationalSnapshot } from "@/lib/operations/operationalSnapshot";
import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";
import type { SnapshotArchiveDecision } from "@/lib/operations/snapshotArchivePolicy";

export type OperationalSnapshotInsert = {
  archive_key: string;
  schema_name: string;
  schema_version: string;
  generated_at: string;
  source: string;
  cadence: string;
  health_status: string;
  health_score: number;
  total_profiles: number;
  total_items: number;
  critical_items: number;
  human_actions: number;
  blocked_actions: number;
  retention_tier: string;
  retain_until: string | null;
  should_persist: boolean;
  snapshot: OperationalSnapshot;
  manifest: OperationalSnapshotManifest;
  created_by?: string | null;
};

export type SemesterCloseRecordInsert = {
  year: number;
  semester: "S1" | "S2";
  starts_at: string;
  ends_at: string;
  status: string;
  can_close: boolean;
  requires_superadmin_review: boolean;
  target: CurrentSemesterClosePreview["target"];
  summary: CurrentSemesterClosePreview["summary"];
  decision: CurrentSemesterClosePreview["decision"];
  report: CurrentSemesterClosePreview["report"];
  action_summary: CurrentSemesterClosePreview["actionSummary"];
  execution_policy: CurrentSemesterClosePreview["executionPolicy"];
  audit_trail: CurrentSemesterClosePreview["auditTrail"];
  snapshot_id?: string | null;
  created_by?: string | null;
};

export type PersistCurrentSemesterClosePreviewResult = {
  snapshotId: string | null;
  closeRecordId: string | null;
  error: string | null;
};

export function buildOperationalSnapshotInsert(input: {
  snapshot: OperationalSnapshot;
  manifest: OperationalSnapshotManifest;
  archive: SnapshotArchiveDecision;
  userId?: string | null;
}): OperationalSnapshotInsert {
  return {
    archive_key: input.manifest.archiveKey,
    schema_name: input.manifest.schemaName,
    schema_version: input.manifest.schemaVersion,
    generated_at: input.manifest.generatedAt,
    source: input.manifest.source,
    cadence: input.archive.archiveKey.cadence,
    health_status: input.manifest.healthStatus,
    health_score: input.manifest.healthScore,
    total_profiles: input.manifest.totalProfiles,
    total_items: input.manifest.totalItems,
    critical_items: input.manifest.criticalItems,
    human_actions: input.manifest.humanActions,
    blocked_actions: input.manifest.blockedActions,
    retention_tier: input.manifest.retentionTier,
    retain_until: input.manifest.retainUntil,
    should_persist: input.manifest.shouldPersist,
    snapshot: input.snapshot,
    manifest: input.manifest,
    created_by: input.userId ?? null,
  };
}

export function buildSemesterCloseRecordInsert(input: {
  preview: CurrentSemesterClosePreview;
  snapshotId?: string | null;
  userId?: string | null;
}): SemesterCloseRecordInsert {
  return {
    year: input.preview.summary.semester.year,
    semester: input.preview.summary.semester.code,
    starts_at: input.preview.summary.semester.startsAt,
    ends_at: input.preview.summary.semester.endsAt,
    status: input.preview.decision.status,
    can_close: input.preview.decision.canClose,
    requires_superadmin_review: input.preview.decision.requiresSuperadminReview,
    target: input.preview.target,
    summary: input.preview.summary,
    decision: input.preview.decision,
    report: input.preview.report,
    action_summary: input.preview.actionSummary,
    execution_policy: input.preview.executionPolicy,
    audit_trail: input.preview.auditTrail,
    snapshot_id: input.snapshotId ?? null,
    created_by: input.userId ?? null,
  };
}

export async function persistCurrentSemesterClosePreview(input: {
  supabase: SupabaseClient;
  preview: CurrentSemesterClosePreview;
  userId?: string | null;
}): Promise<PersistCurrentSemesterClosePreviewResult> {
  const snapshotInsert = buildOperationalSnapshotInsert({
    snapshot: input.preview.snapshot,
    manifest: input.preview.manifest,
    archive: input.preview.archive,
    userId: input.userId,
  });

  const { data: snapshotRow, error: snapshotError } = await input.supabase
    .from("operational_snapshots")
    .insert(snapshotInsert)
    .select("id")
    .maybeSingle();

  if (snapshotError) {
    return {
      snapshotId: null,
      closeRecordId: null,
      error: snapshotError.message,
    };
  }

  const snapshotId = (snapshotRow as { id?: string } | null)?.id ?? null;
  const closeInsert = buildSemesterCloseRecordInsert({
    preview: input.preview,
    snapshotId,
    userId: input.userId,
  });

  const { data: closeRow, error: closeError } = await input.supabase
    .from("semester_close_records")
    .upsert(closeInsert, { onConflict: "year,semester" })
    .select("id")
    .maybeSingle();

  if (closeError) {
    return {
      snapshotId,
      closeRecordId: null,
      error: closeError.message,
    };
  }

  return {
    snapshotId,
    closeRecordId: (closeRow as { id?: string } | null)?.id ?? null,
    error: null,
  };
}
