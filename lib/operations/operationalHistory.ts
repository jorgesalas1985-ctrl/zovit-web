import type { SupabaseClient } from "@supabase/supabase-js";

export type PersistedOperationalSnapshotSummary = {
  id: string;
  archiveKey: string;
  schemaVersion: string;
  generatedAt: string;
  cadence: string;
  healthStatus: string;
  healthScore: number;
  totalProfiles: number;
  totalItems: number;
  criticalItems: number;
  blockedActions: number;
  retentionTier: string;
  shouldPersist: boolean;
};

export type PersistedSemesterCloseSummary = {
  id: string;
  year: number;
  semester: "S1" | "S2";
  startsAt: string;
  endsAt: string;
  status: string;
  canClose: boolean;
  requiresSuperadminReview: boolean;
  createdAt: string;
};

export type OperationalHistorySummary = {
  snapshots: PersistedOperationalSnapshotSummary[];
  semesterCloses: PersistedSemesterCloseSummary[];
  latestSnapshot: PersistedOperationalSnapshotSummary | null;
  latestClose: PersistedSemesterCloseSummary | null;
  snapshotCount: number;
  closeCount: number;
  error: string | null;
};

export async function loadOperationalHistory(
  supabase: SupabaseClient,
  input?: {
    limit?: number;
  },
): Promise<OperationalHistorySummary> {
  const limit = normalizeLimit(input?.limit);
  const [snapshotsResult, closesResult] = await Promise.all([
    loadPersistedOperationalSnapshots(supabase, limit),
    loadPersistedSemesterCloses(supabase, limit),
  ]);

  const errors = [snapshotsResult.error, closesResult.error].filter(Boolean);

  return {
    snapshots: snapshotsResult.items,
    semesterCloses: closesResult.items,
    latestSnapshot: snapshotsResult.items[0] ?? null,
    latestClose: closesResult.items[0] ?? null,
    snapshotCount: snapshotsResult.items.length,
    closeCount: closesResult.items.length,
    error: errors.length ? errors.join(" | ") : null,
  };
}

async function loadPersistedOperationalSnapshots(
  supabase: SupabaseClient,
  limit: number,
): Promise<{
  items: PersistedOperationalSnapshotSummary[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("operational_snapshots")
    .select(
      "id,archive_key,schema_version,generated_at,cadence,health_status,health_score,total_profiles,total_items,critical_items,blocked_actions,retention_tier,should_persist",
    )
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: ((data ?? []) as PersistedOperationalSnapshotRow[]).map(mapSnapshotRow),
    error: null,
  };
}

async function loadPersistedSemesterCloses(
  supabase: SupabaseClient,
  limit: number,
): Promise<{
  items: PersistedSemesterCloseSummary[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("semester_close_records")
    .select(
      "id,year,semester,starts_at,ends_at,status,can_close,requires_superadmin_review,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: ((data ?? []) as PersistedSemesterCloseRow[]).map(mapCloseRow),
    error: null,
  };
}

type PersistedOperationalSnapshotRow = {
  id: string;
  archive_key: string;
  schema_version: string;
  generated_at: string;
  cadence: string;
  health_status: string;
  health_score: number;
  total_profiles: number;
  total_items: number;
  critical_items: number;
  blocked_actions: number;
  retention_tier: string;
  should_persist: boolean;
};

type PersistedSemesterCloseRow = {
  id: string;
  year: number;
  semester: "S1" | "S2";
  starts_at: string;
  ends_at: string;
  status: string;
  can_close: boolean;
  requires_superadmin_review: boolean;
  created_at: string;
};

function mapSnapshotRow(
  row: PersistedOperationalSnapshotRow,
): PersistedOperationalSnapshotSummary {
  return {
    id: row.id,
    archiveKey: row.archive_key,
    schemaVersion: row.schema_version,
    generatedAt: row.generated_at,
    cadence: row.cadence,
    healthStatus: row.health_status,
    healthScore: row.health_score,
    totalProfiles: row.total_profiles,
    totalItems: row.total_items,
    criticalItems: row.critical_items,
    blockedActions: row.blocked_actions,
    retentionTier: row.retention_tier,
    shouldPersist: row.should_persist,
  };
}

function mapCloseRow(row: PersistedSemesterCloseRow): PersistedSemesterCloseSummary {
  return {
    id: row.id,
    year: row.year,
    semester: row.semester,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    canClose: row.can_close,
    requiresSuperadminReview: row.requires_superadmin_review,
    createdAt: row.created_at,
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return 5;
  }

  return Math.min(Math.floor(limit), 20);
}
