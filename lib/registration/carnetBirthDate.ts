import { validateAdultBirthDate } from "@/lib/registration/age";
import { chileanDateToIso } from "@/lib/ui/chileanDate";

export const CARNET_BIRTH_DATE_CONFIRM_ERROR =
  "Debes confirmar que la fecha de nacimiento coincide con la impresa en tu carnet de identidad.";

export const CARNET_BIRTH_DATE_HINT =
  "Cópiala exactamente como aparece en tu carnet (cédula). Debe coincidir con el documento que subes.";

export function validateCarnetBirthDateDeclaration(input: {
  birthDate: string;
  confirmed: boolean;
}): string | null {
  if (!input.birthDate?.trim()) {
    return "Ingresa la fecha de nacimiento tal como aparece en tu carnet.";
  }
  const ageError = validateAdultBirthDate(input.birthDate);
  if (ageError) return ageError;
  if (!input.confirmed) return CARNET_BIRTH_DATE_CONFIRM_ERROR;
  return null;
}

/** Metadata auditada en documentos de cédula. */
export function carnetBirthDateMetadata(birthDate: string): Record<string, unknown> {
  const iso = chileanDateToIso(birthDate);
  return {
    birthDateFromCarnet: iso,
    birthDateFromCarnetDisplay: birthDate.trim(),
    carnetBirthDateConfirmed: true,
    confirmedAt: new Date().toISOString(),
  };
}
