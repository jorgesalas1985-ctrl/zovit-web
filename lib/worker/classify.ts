import type {
  ParticipationChoice,
  ServiceProfileType,
  WorkerRegistrationDraft,
} from "@/lib/worker/types";

const CHOICE_TO_PROFILE: Partial<Record<ParticipationChoice, ServiceProfileType>> = {
  certified: "certified",
  experience: "experience_verified",
  training: "in_training",
  community: "community_collaborator",
};

/** Sugerencia automática — no es verificación definitiva. */
export function suggestProfilesFromParticipation(
  choice: ParticipationChoice | null
): ServiceProfileType[] {
  if (!choice || choice === "unsure") return [];
  const profile = CHOICE_TO_PROFILE[choice];
  return profile ? [profile] : [];
}

export function suggestProfilesFromParticipations(
  choices: ParticipationChoice[]
): ServiceProfileType[] {
  const profiles = new Set<ServiceProfileType>();
  for (const choice of choices) {
    for (const profile of suggestProfilesFromParticipation(choice)) {
      profiles.add(profile);
    }
  }
  return Array.from(profiles);
}

export type GuidedAnswers = {
  hasFormalCredential: boolean | null;
  hasExperience: boolean | null;
  isStudying: boolean | null;
  wantsSupportTasks: boolean | null;
};

export function suggestFromGuidedAssistant(answers: GuidedAnswers): ServiceProfileType[] {
  const suggested = new Set<ServiceProfileType>();

  if (answers.hasFormalCredential) suggested.add("certified");
  if (answers.isStudying) suggested.add("in_training");
  if (answers.hasExperience && !answers.hasFormalCredential) {
    suggested.add("experience_verified");
  }
  if (answers.wantsSupportTasks) suggested.add("community_collaborator");

  if (suggested.size === 0 && answers.wantsSupportTasks === false && answers.hasExperience) {
    suggested.add("experience_verified");
  }

  if (suggested.size === 0) suggested.add("community_collaborator");

  return Array.from(suggested);
}

export function pickPrimaryProfile(profiles: ServiceProfileType[]): ServiceProfileType | null {
  if (!profiles.length) return null;
  const order: ServiceProfileType[] = [
    "certified",
    "experience_verified",
    "in_training",
    "community_collaborator",
  ];
  for (const item of order) {
    if (profiles.includes(item)) return item;
  }
  return profiles[0] ?? null;
}

/** Normaliza borradores antiguos (participation única) al modelo multi-selección. */
export function getParticipations(draft: WorkerRegistrationDraft): ParticipationChoice[] {
  if (Array.isArray(draft.participations) && draft.participations.length) {
    return draft.participations;
  }
  if (draft.participation) return [draft.participation];
  return [];
}

export function deriveSuggestedProfiles(draft: WorkerRegistrationDraft): ServiceProfileType[] {
  const choices = getParticipations(draft);
  if (choices.includes("unsure")) {
    return draft.suggestedProfiles.length
      ? draft.suggestedProfiles
      : ["community_collaborator"];
  }
  const fromChoices = suggestProfilesFromParticipations(choices);
  return fromChoices.length ? fromChoices : draft.suggestedProfiles;
}
