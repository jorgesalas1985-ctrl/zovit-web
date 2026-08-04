import type { SupabaseClient } from "@supabase/supabase-js";

import {
  evaluateDocumentSemesterCompliance,
  resolveDocumentCompliancePeriod,
  type DocumentSemesterCompliance,
  type DocumentSemesterComplianceStatus,
  type SemesterDocumentEvidence,
} from "@/lib/operations/documentSemesterCompliance";
import type { OperationalDocumentKind } from "@/lib/operations/documentRenewalPersistence";

export type DocumentComplianceProfile = {
  profileId: string;
  displayName: string;
  role: string | null;
  primaryServiceProfile: string | null;
  workerRegistrationStatus: string | null;
  compliance: DocumentSemesterCompliance;
};

export type DocumentComplianceDashboard = {
  period: ReturnType<typeof resolveDocumentCompliancePeriod>;
  totalProfiles: number;
  complete: number;
  open: number;
  dueSoon: number;
  pendingReview: number;
  suspensionReady: number;
  profiles: DocumentComplianceProfile[];
  topProfiles: DocumentComplianceProfile[];
  error: string | null;
  summary: string;
};

export async function loadDocumentComplianceDashboard(
  supabase: SupabaseClient,
  input?: {
    limit?: number;
    requiredKinds?: OperationalDocumentKind[];
    now?: Date;
  },
): Promise<DocumentComplianceDashboard> {
  const limit = normalizeLimit(input?.limit);
  const requiredKinds = input?.requiredKinds ?? ["identity", "credential"];
  const period = resolveDocumentCompliancePeriod(input?.now);
  const profilesResult = await loadOperationalProfiles(supabase, limit);

  if (profilesResult.error) {
    return emptyDashboard(period, profilesResult.error);
  }

  if (!profilesResult.items.length) {
    return emptyDashboard(period, null);
  }

  const documentsResult = await loadSemesterDocuments(
    supabase,
    profilesResult.items.map((profile) => profile.profileId),
    period.year,
    period.code,
  );

  if (documentsResult.error) {
    return emptyDashboard(period, documentsResult.error);
  }

  const documentsByProfile = groupDocumentsByProfile(documentsResult.items);
  const profiles = profilesResult.items.map((profile) => ({
    ...profile,
    compliance: evaluateDocumentSemesterCompliance({
      documents: documentsByProfile.get(profile.profileId) ?? [],
      requiredKinds,
      now: input?.now,
    }),
  }));
  const orderedProfiles = profiles.sort(compareComplianceProfiles);

  return {
    period,
    totalProfiles: profiles.length,
    complete: countByStatus(profiles, "complete"),
    open: countByStatus(profiles, "open"),
    dueSoon: countByStatus(profiles, "due_soon"),
    pendingReview: countByStatus(profiles, "pending_review"),
    suspensionReady: countByStatus(profiles, "suspension_ready"),
    profiles: orderedProfiles,
    topProfiles: orderedProfiles.slice(0, Math.min(limit, 8)),
    error: null,
    summary: buildSummary(profiles.length, orderedProfiles),
  };
}

type OperationalProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  primary_service_profile: string | null;
  worker_registration_status: string | null;
};

type OperationalDocumentRow = {
  id: string;
  profile_id: string;
  document_kind: OperationalDocumentKind;
  status: SemesterDocumentEvidence["status"];
  semester_year: number;
  semester: "S1" | "S2";
  submitted_at: string | null;
  updated_at: string | null;
};

async function loadOperationalProfiles(
  supabase: SupabaseClient,
  limit: number,
): Promise<{ items: Omit<DocumentComplianceProfile, "compliance">[]; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,role,primary_service_profile,worker_registration_status")
    .in("worker_registration_status", ["submitted", "approved", "needs_info"])
    .limit(limit);

  if (error) return { items: [], error: error.message };

  return {
    items: ((data ?? []) as OperationalProfileRow[]).map(mapProfileRow),
    error: null,
  };
}

async function loadSemesterDocuments(
  supabase: SupabaseClient,
  profileIds: string[],
  year: number,
  semester: "S1" | "S2",
): Promise<{ items: (SemesterDocumentEvidence & { profileId: string })[]; error: string | null }> {
  const { data, error } = await supabase
    .from("operational_documents")
    .select("id,profile_id,document_kind,status,semester_year,semester,submitted_at,updated_at")
    .in("profile_id", profileIds)
    .eq("semester_year", year)
    .eq("semester", semester);

  if (error) return { items: [], error: error.message };

  return {
    items: ((data ?? []) as OperationalDocumentRow[]).map(mapDocumentRow),
    error: null,
  };
}

function mapProfileRow(row: OperationalProfileRow): Omit<DocumentComplianceProfile, "compliance"> {
  const displayName =
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Perfil sin nombre";

  return {
    profileId: row.id,
    displayName,
    role: row.role,
    primaryServiceProfile: row.primary_service_profile,
    workerRegistrationStatus: row.worker_registration_status,
  };
}

function mapDocumentRow(
  row: OperationalDocumentRow,
): SemesterDocumentEvidence & { profileId: string } {
  return {
    profileId: row.profile_id,
    documentId: row.id,
    documentKind: row.document_kind,
    status: row.status,
    semesterYear: row.semester_year,
    semester: row.semester,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function groupDocumentsByProfile(
  documents: (SemesterDocumentEvidence & { profileId: string })[],
): Map<string, SemesterDocumentEvidence[]> {
  const groups = new Map<string, SemesterDocumentEvidence[]>();

  for (const document of documents) {
    const current = groups.get(document.profileId) ?? [];
    current.push(document);
    groups.set(document.profileId, current);
  }

  return groups;
}

function compareComplianceProfiles(
  left: DocumentComplianceProfile,
  right: DocumentComplianceProfile,
): number {
  const statusDelta =
    statusWeight(right.compliance.status) - statusWeight(left.compliance.status);
  if (statusDelta !== 0) return statusDelta;
  return left.displayName.localeCompare(right.displayName);
}

function statusWeight(status: DocumentSemesterComplianceStatus): number {
  if (status === "suspension_ready") return 5;
  if (status === "pending_review") return 4;
  if (status === "due_soon") return 3;
  if (status === "open") return 2;
  return 1;
}

function countByStatus(
  profiles: DocumentComplianceProfile[],
  status: DocumentSemesterComplianceStatus,
): number {
  return profiles.filter((profile) => profile.compliance.status === status).length;
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return 50;
  return Math.min(Math.floor(limit), 200);
}

function emptyDashboard(
  period: ReturnType<typeof resolveDocumentCompliancePeriod>,
  error: string | null,
): DocumentComplianceDashboard {
  return {
    period,
    totalProfiles: 0,
    complete: 0,
    open: 0,
    dueSoon: 0,
    pendingReview: 0,
    suspensionReady: 0,
    profiles: [],
    topProfiles: [],
    error,
    summary: error
      ? `Cumplimiento documental pendiente: ${error}`
      : "No hay perfiles operativos para evaluar.",
  };
}

function buildSummary(totalProfiles: number, profiles: DocumentComplianceProfile[]): string {
  const critical = profiles.filter(
    (profile) => profile.compliance.status === "suspension_ready",
  ).length;
  if (critical > 0) {
    return `${critical} de ${totalProfiles} perfiles estan listos para suspension documental.`;
  }

  const pending = profiles.filter(
    (profile) => profile.compliance.status === "pending_review",
  ).length;
  if (pending > 0) {
    return `${pending} de ${totalProfiles} perfiles requieren revision documental.`;
  }

  return `Cumplimiento documental evaluado para ${totalProfiles} perfiles.`;
}
