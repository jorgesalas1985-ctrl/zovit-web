import { getParticipations, pickPrimaryProfile, suggestProfilesFromParticipations } from "@/lib/worker/classify";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

export const WORKER_DRAFT_STORAGE_KEY = "zovit-worker-registration-draft";

/** Migra borradores con `participation` única al modelo multi-selección. */
export function normalizeWorkerDraft(draft: WorkerRegistrationDraft): WorkerRegistrationDraft {
  const participations = getParticipations(draft);
  const fromChoices = participations.includes("unsure")
    ? draft.suggestedProfiles
    : suggestProfilesFromParticipations(participations);
  const suggestedProfiles = fromChoices.length ? fromChoices : draft.suggestedProfiles;
  return {
    ...draft,
    participations,
    participation: participations[0] ?? null,
    suggestedProfiles,
    primaryProfile: pickPrimaryProfile(suggestedProfiles) ?? draft.primaryProfile,
  };
}

export function createEmptyWorkerDraft(
  partial?: Partial<WorkerRegistrationDraft["personal"]> & { email?: string }
): WorkerRegistrationDraft {
  return {
    personal: {
      firstName: partial?.firstName ?? "",
      lastName: partial?.lastName ?? "",
      rut: partial?.rut ?? "",
      birthDate: partial?.birthDate ?? "",
      phone: partial?.phone ?? "",
      email: partial?.email ?? "",
      address: partial?.address ?? "",
      commune: partial?.commune ?? "",
    },
    participations: [],
    participation: null,
    suggestedProfiles: [],
    credentials: [],
    experience: {
      trade: "",
      yearsExperience: "",
      description: "",
      tools: "",
      serviceZones: "",
      references: "",
      portfolioNotes: "",
    },
    training: {
      institution: "",
      career: "",
      semester: "",
      expectedGraduation: "",
      competencies: "",
      allowedWorks: "",
      tutorReference: "",
    },
    community: {
      availability: "",
      communes: "",
      transport: "",
      canLiftWeight: "",
      taskTypes: [],
      emergencyContact: "",
      safetyAccepted: false,
    },
    services: [],
    availability: {
      days: [],
      hoursFrom: "09:00",
      hoursTo: "18:00",
      communes: "",
      radiusKm: "",
      attentionMode: "both",
      transport: "",
      referenceRate: "",
    },
    consentAccepted: false,
    primaryProfile: null,
    status: "draft",
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalWorkerDraft(): WorkerRegistrationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeWorkerDraft(JSON.parse(raw) as WorkerRegistrationDraft);
  } catch {
    return null;
  }
}

export function saveLocalWorkerDraft(draft: WorkerRegistrationDraft): void {
  if (typeof window === "undefined") return;
  const next = { ...draft, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(WORKER_DRAFT_STORAGE_KEY, JSON.stringify(next));
}

export function clearLocalWorkerDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKER_DRAFT_STORAGE_KEY);
}

export function newCredentialId(): string {
  return `cred_${crypto.randomUUID()}`;
}
