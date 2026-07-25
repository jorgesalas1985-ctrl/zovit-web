/** Perfiles de servicio ZOVIT — formas distintas de aportar, no una escala de superioridad. */
export type ServiceProfileType =
  | "certified"
  | "experience_verified"
  | "in_training"
  | "community_collaborator";

export type WorkerRegistrationStatus =
  | "draft"
  | "incomplete"
  | "submitted"
  | "needs_info"
  | "verified"
  | "partially_verified"
  | "rejected"
  | "suspended"
  | "document_expired";

export type CredentialDocStatus = "pending" | "verified" | "rejected" | "expired";

export type ServiceAuthorizationStatus = "blocked" | "pending" | "authorized" | "revoked";

export type ParticipationChoice =
  | "certified"
  | "experience"
  | "training"
  | "community"
  | "unsure";

export type WorkerCredentialDraft = {
  id: string;
  profession: string;
  institution: string;
  credentialName: string;
  yearObtained: string;
  registryNumber: string;
  expiresAt: string;
  documentName?: string;
};

export type WorkerExperienceDraft = {
  trade: string;
  yearsExperience: string;
  description: string;
  tools: string;
  serviceZones: string;
  references: string;
  portfolioNotes: string;
};

export type WorkerTrainingDraft = {
  institution: string;
  career: string;
  semester: string;
  expectedGraduation: string;
  competencies: string;
  allowedWorks: string;
  tutorReference: string;
  enrollmentDocName?: string;
};

export type WorkerCommunityDraft = {
  availability: string;
  communes: string;
  transport: string;
  canLiftWeight: "" | "yes" | "no" | "prefer_not";
  taskTypes: string[];
  emergencyContact: string;
  safetyAccepted: boolean;
};

export type WorkerServiceSelection = {
  categorySlug: string;
  categoryName: string;
  specialtySlug: string;
  specialtyName: string;
  requiresCredential: boolean;
  authorizationStatus: ServiceAuthorizationStatus;
};

export type WorkerAvailabilityDraft = {
  days: string[];
  hoursFrom: string;
  hoursTo: string;
  communes: string;
  radiusKm: string;
  attentionMode: "immediate" | "scheduled" | "both";
  transport: string;
  referenceRate: string;
};

export type WorkerPersonalDraft = {
  firstName: string;
  lastName: string;
  rut: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  commune: string;
};

export type WorkerRegistrationDraft = {
  personal: WorkerPersonalDraft;
  /** Puede incluir una, varias o todas las capacidades (excepto "unsure", que es exclusivo). */
  participations: ParticipationChoice[];
  /** @deprecated Usar participations. Se mantiene por borradores antiguos en localStorage. */
  participation?: ParticipationChoice | null;
  suggestedProfiles: ServiceProfileType[];
  credentials: WorkerCredentialDraft[];
  experience: WorkerExperienceDraft;
  training: WorkerTrainingDraft;
  community: WorkerCommunityDraft;
  services: WorkerServiceSelection[];
  availability: WorkerAvailabilityDraft;
  consentAccepted: boolean;
  primaryProfile: ServiceProfileType | null;
  status: WorkerRegistrationStatus;
  updatedAt: string;
};

export type PublicWorkerBadge =
  | "identity_verified"
  | "background_reviewed"
  | "title_verified"
  | "certification_verified"
  | "license_valid"
  | "experience_proven"
  | "student_active"
  | "in_training"
  | "community_collaborator"
  | "zovit_featured"
  | "jobs_completed"
  | "avg_rating"
  | "fulfillment_rate";
