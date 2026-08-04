import { validateAdultBirthDate } from "@/lib/registration/age";
import { isValidChileanRut } from "@/lib/registration/validateRegistration";
import { isValidChileanDate } from "@/lib/ui/chileanDate";
import { RUT_FORMAT_ERROR } from "@/lib/ui/fieldPlaceholders";
import type { ServiceProfileType, WorkerRegistrationDraft } from "@/lib/worker/types";
import { deriveSuggestedProfiles } from "@/lib/worker/classify";

export type WorkerFieldId =
  | "personal.firstName"
  | "personal.lastName"
  | "personal.rut"
  | "personal.birthDate"
  | "personal.phone"
  | "personal.email"
  | "personal.address"
  | "participation"
  | "credentials"
  | "credentials.document"
  | "experience"
  | "training.institution"
  | "training.enrollment"
  | "community.availability"
  | "community.tasks"
  | "community.emergency"
  | "community.safety"
  | "services"
  | "availability.days"
  | "availability.communes"
  | "review.consent";

export type ValidationIssue = {
  message: string;
  fieldId: WorkerFieldId;
  step: number;
};

function filled(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

export function validatePersonalStep(draft: WorkerRegistrationDraft): string | null {
  return getPersonalIssue(draft)?.message ?? null;
}

function getPersonalIssue(draft: WorkerRegistrationDraft): ValidationIssue | null {
  const p = draft.personal;
  if (!filled(p.firstName)) {
    return { message: "Completa tus nombres.", fieldId: "personal.firstName", step: 1 };
  }
  if (!filled(p.lastName)) {
    return { message: "Completa tus apellidos.", fieldId: "personal.lastName", step: 1 };
  }
  if (!filled(p.rut)) {
    return { message: `Completa el RUT. ${RUT_FORMAT_ERROR}`, fieldId: "personal.rut", step: 1 };
  }
  if (!isValidChileanRut(p.rut)) {
    return { message: RUT_FORMAT_ERROR, fieldId: "personal.rut", step: 1 };
  }
  if (!filled(p.birthDate)) {
    return {
      message: "Ingresa tu fecha de nacimiento (dd/mm/aaaa).",
      fieldId: "personal.birthDate",
      step: 1,
    };
  }
  if (!isValidChileanDate(p.birthDate)) {
    return {
      message: "Fecha de nacimiento inválida. Usa día/mes/año, ej: 15/03/1990.",
      fieldId: "personal.birthDate",
      step: 1,
    };
  }
  const ageError = validateAdultBirthDate(p.birthDate);
  if (ageError) {
    return {
      message: ageError,
      fieldId: "personal.birthDate",
      step: 1,
    };
  }
  if (!filled(p.phone)) {
    return {
      message: "Ingresa tu teléfono. Ejemplo: +56 9 8765 4321",
      fieldId: "personal.phone",
      step: 1,
    };
  }
  if (!filled(p.email)) {
    return {
      message: "Ingresa tu correo. Ejemplo: nombre@correo.com",
      fieldId: "personal.email",
      step: 1,
    };
  }
  if (!filled(p.address) && !filled(p.commune)) {
    return {
      message: "Ingresa tu dirección o comuna. Ejemplo: Santiago, Maipú",
      fieldId: "personal.address",
      step: 1,
    };
  }
  return null;
}

export function validateParticipationStep(draft: WorkerRegistrationDraft): string | null {
  return getParticipationIssue(draft)?.message ?? null;
}

function getParticipationIssue(draft: WorkerRegistrationDraft): ValidationIssue | null {
  const choices =
    Array.isArray(draft.participations) && draft.participations.length
      ? draft.participations
      : draft.participation
        ? [draft.participation]
        : [];

  if (!choices.length) {
    return {
      message: "Elige una o más formas de participar en ZOVIT según tus capacidades.",
      fieldId: "participation",
      step: 2,
    };
  }
  if (choices.includes("unsure") && draft.suggestedProfiles.length === 0) {
    return {
      message: "Completa el asistente guiado o marca otra opción.",
      fieldId: "participation",
      step: 2,
    };
  }
  return null;
}

export function validateAntecedentsStep(draft: WorkerRegistrationDraft): string | null {
  return getAntecedentsIssue(draft)?.message ?? null;
}

function getAntecedentsIssue(draft: WorkerRegistrationDraft): ValidationIssue | null {
  const profiles = deriveSuggestedProfiles(draft);

  if (profiles.includes("certified")) {
    if (!draft.credentials.length) {
      return {
        message: "Agrega al menos un título, licencia o certificación.",
        fieldId: "credentials",
        step: 3,
      };
    }
    for (const cred of draft.credentials) {
      if (!filled(cred.profession) || !filled(cred.credentialName) || !filled(cred.institution)) {
        return {
          message: "Completa profesión, institución y nombre del título/certificación.",
          fieldId: "credentials",
          step: 3,
        };
      }
      if (!filled(cred.storagePath ?? "")) {
        return {
          message: "Sube el archivo del título, licencia o certificación (JPG, PNG, WEBP o PDF).",
          fieldId: "credentials.document",
          step: 3,
        };
      }
    }
  }

  if (profiles.includes("experience_verified")) {
    const e = draft.experience;
    if (!filled(e.trade) || !filled(e.yearsExperience) || !filled(e.description)) {
      return {
        message: "Completa oficio, años de experiencia y descripción laboral.",
        fieldId: "experience",
        step: 3,
      };
    }
  }

  if (profiles.includes("in_training")) {
    const t = draft.training;
    if (!filled(t.institution) || !filled(t.career)) {
      return {
        message: "Completa institución y carrera/especialidad.",
        fieldId: "training.institution",
        step: 3,
      };
    }
    if (!filled(t.enrollmentStoragePath ?? "")) {
      return {
        message: "Sube el certificado de alumno regular o matrícula (JPG, PNG, WEBP o PDF).",
        fieldId: "training.enrollment",
        step: 3,
      };
    }
  }

  if (profiles.includes("community_collaborator")) {
    const c = draft.community;
    if (!filled(c.availability) || !filled(c.communes)) {
      return {
        message: "Indica disponibilidad y comuna/zona de atención.",
        fieldId: "community.availability",
        step: 3,
      };
    }
    if (!c.taskTypes.length) {
      return {
        message: "Selecciona al menos un tipo de tarea de apoyo.",
        fieldId: "community.tasks",
        step: 3,
      };
    }
    if (!filled(c.emergencyContact)) {
      return {
        message: "Ingresa un contacto de emergencia.",
        fieldId: "community.emergency",
        step: 3,
      };
    }
    if (!c.safetyAccepted) {
      return {
        message: "Debes aceptar las normas de seguridad.",
        fieldId: "community.safety",
        step: 3,
      };
    }
  }

  return null;
}

export function validateServicesStep(draft: WorkerRegistrationDraft): string | null {
  return getServicesIssue(draft)?.message ?? null;
}

function getServicesIssue(draft: WorkerRegistrationDraft): ValidationIssue | null {
  if (!draft.services.length) {
    return {
      message: "Selecciona al menos un servicio que puedas realizar.",
      fieldId: "services",
      step: 4,
    };
  }
  return null;
}

export function validateAvailabilityStep(draft: WorkerRegistrationDraft): string | null {
  return getAvailabilityIssue(draft)?.message ?? null;
}

function getAvailabilityIssue(draft: WorkerRegistrationDraft): ValidationIssue | null {
  const a = draft.availability;
  if (!a.days.length) {
    return {
      message: "Selecciona al menos un día disponible.",
      fieldId: "availability.days",
      step: 5,
    };
  }
  if (!filled(a.communes)) {
    return {
      message: "Indica comunas o radio de atención.",
      fieldId: "availability.communes",
      step: 5,
    };
  }
  return null;
}

export function validateReviewStep(draft: WorkerRegistrationDraft): string | null {
  return getReviewIssue(draft)?.message ?? null;
}

function getReviewIssue(draft: WorkerRegistrationDraft): ValidationIssue | null {
  if (!draft.consentAccepted) {
    return {
      message: "Debes aceptar el consentimiento informado para enviar tus antecedentes.",
      fieldId: "review.consent",
      step: 6,
    };
  }
  return (
    getPersonalIssue(draft) ||
    getParticipationIssue(draft) ||
    getAntecedentsIssue(draft) ||
    getServicesIssue(draft) ||
    getAvailabilityIssue(draft)
  );
}

/** Devuelve el primer error con paso y campo para scroll/resaltado. */
export function getStepValidationIssue(
  step: number,
  draft: WorkerRegistrationDraft
): ValidationIssue | null {
  switch (step) {
    case 1:
      return getPersonalIssue(draft);
    case 2:
      return getParticipationIssue(draft);
    case 3:
      return getAntecedentsIssue(draft);
    case 4:
      return getServicesIssue(draft);
    case 5:
      return getAvailabilityIssue(draft);
    case 6:
      return getReviewIssue(draft);
    default:
      return null;
  }
}

export function isStepComplete(step: number, draft: WorkerRegistrationDraft): boolean {
  return !getStepValidationIssue(step, draft);
}

export function activeProfileSet(draft: WorkerRegistrationDraft): ServiceProfileType[] {
  return deriveSuggestedProfiles(draft);
}
