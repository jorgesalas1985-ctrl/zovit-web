import type { OperationalDocumentKind } from "@/lib/operations/documentRenewalPersistence";
import { deriveSuggestedProfiles } from "@/lib/worker/classify";
import type { ServiceProfileType, WorkerRegistrationDraft } from "@/lib/worker/types";

export type RequiredDocumentContext = {
  accountKind?: string | null;
  primaryProfile?: ServiceProfileType | string | null;
  draft?: Pick<WorkerRegistrationDraft, "participations" | "participation" | "suggestedProfiles">;
};

export function isStudentAccount(accountKind?: string | null): boolean {
  return accountKind === "student";
}

/** Documentos que cierran el 14% restante según el tipo de perfil. */
export function resolveRequiredDocumentKinds(
  context: RequiredDocumentContext = {},
): OperationalDocumentKind[] {
  const profiles = new Set<string>();

  if (context.primaryProfile) profiles.add(context.primaryProfile);
  if (context.draft) {
    for (const profile of deriveSuggestedProfiles(context.draft as WorkerRegistrationDraft)) {
      profiles.add(profile);
    }
  }
  if (isStudentAccount(context.accountKind)) {
    profiles.add("in_training");
  }

  const kinds = new Set<OperationalDocumentKind>();
  if (profiles.has("in_training")) kinds.add("student_enrollment");
  if (profiles.has("certified")) kinds.add("credential");

  if (kinds.size === 0) {
    return isStudentAccount(context.accountKind) ? ["student_enrollment"] : ["credential"];
  }

  return Array.from(kinds);
}
