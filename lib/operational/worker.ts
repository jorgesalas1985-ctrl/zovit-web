import {
  evaluateOperationalStatus,
  type DocumentValidationStatus,
  type OperationalDecision,
  type SupervisionMode,
} from "@/lib/operational/status";
import type {
  CredentialDocStatus,
  ServiceProfileType,
  WorkerRegistrationStatus,
} from "@/lib/worker/types";

export type WorkerCredentialOperationalInput = {
  status: CredentialDocStatus | string | null | undefined;
  expiresAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
};

export type WorkerOperationalInput = {
  workerStatus: WorkerRegistrationStatus | string | null | undefined;
  primaryProfile?: ServiceProfileType | string | null;
  credentials?: WorkerCredentialOperationalInput[];
  identityStatus?: "none" | "pending" | "approved" | "rejected" | null;
  identityVerified?: boolean | null;
  biometricVerified?: boolean | null;
  riskBlockActive?: boolean | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
  now?: Date;
};

function documentStatusFromWorkerStatus(
  status: WorkerRegistrationStatus | string | null | undefined,
): DocumentValidationStatus {
  if (status === "verified" || status === "partially_verified") return "verified";
  if (status === "rejected") return "rejected";
  if (status === "document_expired") return "expired";
  if (status === "submitted" || status === "needs_info") return "pending";
  return "missing";
}

function documentStatusFromCredentials(
  credentials: WorkerCredentialOperationalInput[],
): DocumentValidationStatus | null {
  if (!credentials.length) return null;
  if (credentials.some((credential) => credential.status === "expired")) return "expired";
  if (credentials.some((credential) => credential.status === "rejected")) return "rejected";
  if (credentials.some((credential) => credential.status === "pending")) return "pending";
  if (credentials.every((credential) => credential.status === "verified")) return "verified";
  return "pending";
}

function pickEarliestExpiry(credentials: WorkerCredentialOperationalInput[]): string | null {
  const dates = credentials
    .map((credential) => credential.expiresAt?.slice(0, 10))
    .filter((date): date is string => Boolean(date))
    .sort();

  return dates[0] ?? null;
}

function pickLatestRenewal(input: WorkerOperationalInput): string | null {
  const dates = [
    input.reviewedAt,
    input.updatedAt,
    ...(input.credentials ?? []).flatMap((credential) => [
      credential.reviewedAt ?? null,
      credential.updatedAt ?? null,
    ]),
  ]
    .map((date) => date?.slice(0, 10))
    .filter((date): date is string => Boolean(date))
    .sort();

  return dates.at(-1) ?? null;
}

function supervisionModeForProfile(
  profile: ServiceProfileType | string | null | undefined,
): SupervisionMode {
  if (profile === "in_training") return "required";
  return "none";
}

export function evaluateWorkerOperationalStatus(
  input: WorkerOperationalInput,
): OperationalDecision {
  const credentials = input.credentials ?? [];
  const credentialStatus = documentStatusFromCredentials(credentials);
  const workerStatus = documentStatusFromWorkerStatus(input.workerStatus);
  const documentStatus = credentialStatus ?? workerStatus;

  return evaluateOperationalStatus({
    identityStatus: input.identityStatus ?? "approved",
    identityVerified: input.identityVerified ?? true,
    biometricVerified: input.biometricVerified ?? true,
    documentStatus,
    documentExpiresAt: pickEarliestExpiry(credentials),
    lastDocumentRenewalAt: pickLatestRenewal(input),
    riskBlockActive: input.riskBlockActive,
    supervisionMode: supervisionModeForProfile(input.primaryProfile),
    now: input.now,
  });
}
