import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";

export type SnapshotManifestCatalogFilters = {
  schemaVersion?: string;
  healthStatus?: string;
  retentionTier?: string;
  shouldPersist?: boolean;
  from?: string;
  to?: string;
};

export type SnapshotManifestCatalogSummary = {
  total: number;
  returned: number;
  persistent: number;
  nonPersistent: number;
  critical: number;
  warning: number;
  averageHealthScore: number;
  latestGeneratedAt: string | null;
};

export type SnapshotManifestCatalog = {
  manifests: OperationalSnapshotManifest[];
  summary: SnapshotManifestCatalogSummary;
};

export function buildSnapshotManifestCatalog(input: {
  manifests: OperationalSnapshotManifest[];
  filters?: SnapshotManifestCatalogFilters;
  limit?: number;
}): SnapshotManifestCatalog {
  const filtered = input.manifests
    .filter((manifest) => matchesFilters(manifest, input.filters))
    .sort((left, right) => compareGeneratedAtDesc(left.generatedAt, right.generatedAt));

  const limit = normalizeLimit(input.limit);
  const manifests = limit === null ? filtered : filtered.slice(0, limit);

  return {
    manifests,
    summary: summarizeManifests(filtered, manifests.length),
  };
}

function matchesFilters(
  manifest: OperationalSnapshotManifest,
  filters: SnapshotManifestCatalogFilters | undefined,
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.schemaVersion && manifest.schemaVersion !== filters.schemaVersion) {
    return false;
  }

  if (filters.healthStatus && manifest.healthStatus !== filters.healthStatus) {
    return false;
  }

  if (filters.retentionTier && manifest.retentionTier !== filters.retentionTier) {
    return false;
  }

  if (
    typeof filters.shouldPersist === "boolean" &&
    manifest.shouldPersist !== filters.shouldPersist
  ) {
    return false;
  }

  return isInsideDateRange(manifest.generatedAt, filters.from, filters.to);
}

function isInsideDateRange(
  generatedAt: string,
  from: string | undefined,
  to: string | undefined,
): boolean {
  const generatedTime = Date.parse(generatedAt);

  if (Number.isNaN(generatedTime)) {
    return false;
  }

  if (from && generatedTime < startOfDay(from)) {
    return false;
  }

  if (to && generatedTime > endOfDay(to)) {
    return false;
  }

  return true;
}

function startOfDay(value: string): number {
  const dateOnly = value.slice(0, 10);
  return Date.parse(`${dateOnly}T00:00:00.000Z`);
}

function endOfDay(value: string): number {
  const dateOnly = value.slice(0, 10);
  return Date.parse(`${dateOnly}T23:59:59.999Z`);
}

function compareGeneratedAtDesc(left: string, right: string): number {
  return Date.parse(right) - Date.parse(left);
}

function normalizeLimit(limit: number | undefined): number | null {
  if (typeof limit !== "number") {
    return null;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.floor(limit);
}

function summarizeManifests(
  manifests: OperationalSnapshotManifest[],
  returned: number,
): SnapshotManifestCatalogSummary {
  const totalScore = manifests.reduce(
    (sum, manifest) => sum + manifest.healthScore,
    0,
  );

  return {
    total: manifests.length,
    returned,
    persistent: manifests.filter((manifest) => manifest.shouldPersist).length,
    nonPersistent: manifests.filter((manifest) => !manifest.shouldPersist).length,
    critical: manifests.filter((manifest) => manifest.healthStatus === "critical")
      .length,
    warning: manifests.filter((manifest) =>
      ["watch", "risk"].includes(manifest.healthStatus),
    ).length,
    averageHealthScore:
      manifests.length === 0 ? 0 : Math.round(totalScore / manifests.length),
    latestGeneratedAt: manifests[0]?.generatedAt ?? null,
  };
}
