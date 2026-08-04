import type { OperationalSnapshot } from "@/lib/operations/operationalSnapshot";
import type { SnapshotArchiveDecision } from "@/lib/operations/snapshotArchivePolicy";

export type OperationalSnapshotManifest = {
  archiveKey: string;
  schemaName: string;
  schemaVersion: string;
  generatedAt: string;
  source: string;
  healthStatus: string;
  healthScore: number;
  totalProfiles: number;
  totalItems: number;
  criticalItems: number;
  humanActions: number;
  blockedActions: number;
  retentionTier: string;
  retainUntil: string | null;
  shouldPersist: boolean;
};

export function buildOperationalSnapshotManifest(input: {
  snapshot: OperationalSnapshot;
  archive: SnapshotArchiveDecision;
}): OperationalSnapshotManifest {
  return {
    archiveKey: input.archive.archiveKey.key,
    schemaName: input.snapshot.metadata.schemaName,
    schemaVersion: input.snapshot.metadata.schemaVersion,
    generatedAt: input.snapshot.generatedAt,
    source: input.snapshot.metadata.source,
    healthStatus: input.snapshot.healthPulse.status,
    healthScore: input.snapshot.healthPulse.score,
    totalProfiles: input.snapshot.controlCenter.totalProfiles,
    totalItems: input.snapshot.controlCenter.totalItems,
    criticalItems: input.snapshot.controlCenter.priorityMetrics.critical,
    humanActions: input.snapshot.controlCenter.requiresHumanAction,
    blockedActions: input.snapshot.executionPolicy.blockedCount,
    retentionTier: input.archive.retentionTier,
    retainUntil: input.archive.retainUntil,
    shouldPersist: input.archive.shouldPersist,
  };
}
