import type { ControlCenterProfileInput } from "@/lib/operations/controlCenterProfiles";
import {
  buildCurrentSemesterClose,
  type CurrentSemesterClose,
} from "@/lib/operations/currentSemesterClose";
import { buildOperationalSnapshot, type OperationalSnapshot } from "@/lib/operations/operationalSnapshot";
import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";
import { buildOperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";
import {
  decideSnapshotArchive,
  type SnapshotArchiveDecision,
  type SnapshotCadence,
} from "@/lib/operations/snapshotArchivePolicy";

export type CurrentSemesterClosePreview = CurrentSemesterClose & {
  snapshot: OperationalSnapshot;
  archive: SnapshotArchiveDecision;
  manifest: OperationalSnapshotManifest;
  generatedFrom: "current_snapshot_preview";
};

export function buildCurrentSemesterClosePreview(input: {
  profiles: ControlCenterProfileInput[];
  now?: Date;
  cadence?: SnapshotCadence;
}): CurrentSemesterClosePreview {
  const now = input.now ?? new Date();
  const snapshot = buildOperationalSnapshot({
    profiles: input.profiles,
    generatedAt: now,
    source: "in_memory_profiles",
  });
  const archive = decideSnapshotArchive({
    snapshot,
    cadence: input.cadence ?? "manual",
    now,
  });
  const manifest = buildOperationalSnapshotManifest({ snapshot, archive });
  const close = buildCurrentSemesterClose({
    manifests: [manifest],
    now,
  });

  return {
    ...close,
    snapshot,
    archive,
    manifest,
    generatedFrom: "current_snapshot_preview",
  };
}
