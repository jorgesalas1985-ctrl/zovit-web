import { isValidChileanRut } from "@/lib/registration/validateRegistration";
import { RUT_FORMAT_ERROR } from "@/lib/ui/fieldPlaceholders";
import type { ServiceProfileType, WorkerRegistrationDraft } from "@/lib/worker/types";
import { deriveSuggestedProfiles } from "@/lib/worker/classify";

function filled(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

export function validatePersonalStep(draft: WorkerRegistrationDraft): string | null {
  const p = draft.personal;
  if (!filled(p.firstName)) return "Completa tus nombres.";
  if (!filled(p.lastName)) return "Completa tus apellidos.";
  if (!filled(p.rut)) return `Completa el RUT. ${RUT_FORMAT_ERROR}`;
  if (!isValidChileanRut(p.rut)) return RUT_FORMAT_ERROR;
  if (!filled(p.birthDate)) return "Ingresa tu fecha de nacimiento (dd-mm-aaaa).";
  if (!filled(p.phone)) return "Ingresa tu teléfono. Ejemplo: +56 9 1234 5678";
  if (!filled(p.email)) return "Ingresa tu correo. Ejemplo: nombre@correo.com";
  if (!filled(p.address) && !filled(p.commune)) {
    return "Ingresa tu dirección o comuna. Ejemplo: Santiago, Maipú";
  }
  return null;
}

export function validateParticipationStep(draft: WorkerRegistrationDraft): string | null {
  const choices =
    Array.isArray(draft.participations) && draft.participations.length
      ? draft.participations
      : draft.participation
        ? [draft.participation]
        : [];

  if (!choices.length) {
    return "Elige una o más formas de participar en ZOVIT según tus capacidades.";
  }
  if (choices.includes("unsure") && draft.suggestedProfiles.length === 0) {
    return "Completa el asistente guiado o marca otra opción.";
  }
  return null;
}

export function validateAntecedentsStep(draft: WorkerRegistrationDraft): string | null {
  const profiles = deriveSuggestedProfiles(draft);

  if (profiles.includes("certified")) {
    if (!draft.credentials.length) {
      return "Agrega al menos un título, licencia o certificación.";
    }
    for (const cred of draft.credentials) {
      if (!filled(cred.profession) || !filled(cred.credentialName) || !filled(cred.institution)) {
        return "Completa profesión, institución y nombre del título/certificación.";
      }
    }
  }

  if (profiles.includes("experience_verified")) {
    const e = draft.experience;
    if (!filled(e.trade) || !filled(e.yearsExperience) || !filled(e.description)) {
      return "Completa oficio, años de experiencia y descripción laboral.";
    }
  }

  if (profiles.includes("in_training")) {
    const t = draft.training;
    if (!filled(t.institution) || !filled(t.career)) {
      return "Completa institución y carrera/especialidad.";
    }
  }

  if (profiles.includes("community_collaborator")) {
    const c = draft.community;
    if (!filled(c.availability) || !filled(c.communes)) {
      return "Indica disponibilidad y comuna/zona de atención.";
    }
    if (!c.taskTypes.length) return "Selecciona al menos un tipo de tarea de apoyo.";
    if (!filled(c.emergencyContact)) return "Ingresa un contacto de emergencia.";
    if (!c.safetyAccepted) return "Debes aceptar las normas de seguridad.";
  }

  return null;
}

export function validateServicesStep(draft: WorkerRegistrationDraft): string | null {
  if (!draft.services.length) {
    return "Selecciona al menos un servicio que puedas realizar.";
  }
  return null;
}

export function validateAvailabilityStep(draft: WorkerRegistrationDraft): string | null {
  const a = draft.availability;
  if (!a.days.length) return "Selecciona al menos un día disponible.";
  if (!filled(a.communes)) return "Indica comunas o radio de atención.";
  return null;
}

export function validateReviewStep(draft: WorkerRegistrationDraft): string | null {
  if (!draft.consentAccepted) {
    return "Debes aceptar el consentimiento informado para enviar tus antecedentes.";
  }
  return (
    validatePersonalStep(draft) ||
    validateParticipationStep(draft) ||
    validateAntecedentsStep(draft) ||
    validateServicesStep(draft) ||
    validateAvailabilityStep(draft)
  );
}

export function isStepComplete(
  step: number,
  draft: WorkerRegistrationDraft
): boolean {
  switch (step) {
    case 1:
      return !validatePersonalStep(draft);
    case 2:
      return !validateParticipationStep(draft);
    case 3:
      return !validateAntecedentsStep(draft);
    case 4:
      return !validateServicesStep(draft);
    case 5:
      return !validateAvailabilityStep(draft);
    case 6:
      return !validateReviewStep(draft);
    default:
      return true;
  }
}

export function activeProfileSet(draft: WorkerRegistrationDraft): ServiceProfileType[] {
  return deriveSuggestedProfiles(draft);
}
