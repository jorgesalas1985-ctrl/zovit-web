import { getSemesterPeriod, type SemesterPeriod } from "@/lib/operational/status";
import type { OperationalSnapshot } from "@/lib/operations/operationalSnapshot";

export type SnapshotCadence = "daily" | "weekly" | "semester_close" | "manual";

export type SnapshotRetentionTier = "short_term" | "semester" | "annual" | "founder_archive";

export type SnapshotArchiveKey = {
  key: string;
  year: number;
  semester: SemesterPeriod["code"];
  cadence: SnapshotCadence;
};

export type SnapshotArchiveDecision = {
  archiveKey: SnapshotArchiveKey;
  retentionTier: SnapshotRetentionTier;
  retainUntil: string | null;
  shouldPersist: boolean;
  summary: string;
};

export function decideSnapshotArchive(input: {
  snapshot: OperationalSnapshot;
  cadence: SnapshotCadence;
  now?: Date;
}): SnapshotArchiveDecision {
  const now = input.now ?? new Date(input.snapshot.generatedAt);
  const semester = getSemesterPeriod(now);
  const archiveKey = buildSnapshotArchiveKey({
    generatedAt: input.snapshot.generatedAt,
    schemaVersion: input.snapshot.metadata.schemaVersion,
    semester,
    cadence: input.cadence,
  });
  const retentionTier = retentionTierForCadence(input.cadence);
  const retainUntil = retainUntilForTier(retentionTier, now, semester);

  return {
    archiveKey,
    retentionTier,
    retainUntil,
    shouldPersist: input.cadence !== "manual" || input.snapshot.healthPulse.status !== "healthy",
    summary: summaryFromArchiveDecision(retentionTier, retainUntil),
  };
}

function buildSnapshotArchiveKey(input: {
  generatedAt: string;
  schemaVersion: string;
  semester: SemesterPeriod;
  cadence: SnapshotCadence;
}): SnapshotArchiveKey {
  const stamp = input.generatedAt.replace(/[-:.]/g, "").replace("T", "_").replace("Z", "Z");
  const semesterCode = input.semester.code;
  const key = [
    "operational-snapshot",
    input.semester.year,
    semesterCode,
    input.cadence,
    input.schemaVersion,
    stamp,
  ].join("/");

  return {
    key,
    year: input.semester.year,
    semester: semesterCode,
    cadence: input.cadence,
  };
}

function retentionTierForCadence(cadence: SnapshotCadence): SnapshotRetentionTier {
  if (cadence === "daily") return "short_term";
  if (cadence === "weekly") return "semester";
  if (cadence === "semester_close") return "annual";
  return "founder_archive";
}

function retainUntilForTier(
  tier: SnapshotRetentionTier,
  now: Date,
  semester: SemesterPeriod,
): string | null {
  if (tier === "founder_archive") return null;

  const year = now.getFullYear();
  if (tier === "short_term") return addDays(now, 45);
  if (tier === "semester") return semester.endsAt;
  return `${year + 5}-12-31`;
}

function addDays(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

function summaryFromArchiveDecision(
  tier: SnapshotRetentionTier,
  retainUntil: string | null,
): string {
  if (tier === "founder_archive") {
    return "Snapshot reservado para archivo fundador sin fecha de eliminacion.";
  }

  return `Snapshot retenido como ${tier} hasta ${retainUntil}.`;
}
