import {
  BIRTH_DATE_REQUIRED_ERROR,
  validateAdultBirthDate,
} from "@/lib/registration/age";

export type RegistrationProfileFields = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  commune: string;
  rut: string;
  birthDate: string;
};

const FIELD_LABELS: Record<keyof RegistrationProfileFields, string> = {
  firstName: "Nombres",
  lastName: "Apellidos",
  phone: "Teléfono",
  email: "Correo electrónico",
  password: "Contraseña",
  address: "Dirección",
  commune: "Comuna",
  rut: "RUT",
  birthDate: "Fecha de nacimiento",
};

/** Normaliza RUT chileno a formato 12.123.456-7 */
export function normalizeChileanRut(value: string): string {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (cleaned.length < 2) return cleaned;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${dv}`;
}

/** Valida dígito verificador del RUT chileno. */
export function isValidChileanRut(value: string): boolean {
  const normalized = normalizeChileanRut(value);
  const match = normalized.match(/^(\d{1,2}(?:\.\d{3}){2})-([\dK])$/);
  if (!match) return false;

  const body = match[1];
  const dv = match[2];
  const digits = body.replace(/\./g, "");
  let sum = 0;
  let multiplier = 2;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    sum += Number(digits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return dv === expected;
}

export function validateRegistrationFields(
  fields: RegistrationProfileFields
): string | null {
  for (const key of Object.keys(FIELD_LABELS) as Array<keyof RegistrationProfileFields>) {
    if (!fields[key]?.trim()) {
      return `Completa el campo ${FIELD_LABELS[key]} para crear tu cuenta.`;
    }
  }

  if (!isValidChileanRut(fields.rut)) {
    return "Ingresa un RUT válido. Usa el formato 12.123.456-7.";
  }

  if (!fields.birthDate?.trim()) {
    return BIRTH_DATE_REQUIRED_ERROR;
  }

  const ageError = validateAdultBirthDate(fields.birthDate);
  if (ageError) return ageError;

  const phoneDigits = fields.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8) {
    return "Ingresa un teléfono válido. Ejemplo: +56 9 8765 4321";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    return "Ingresa un correo válido. Ejemplo: nombre@correo.com";
  }

  return null;
}

export function isRegistrationComplete(fields: RegistrationProfileFields): boolean {
  return validateRegistrationFields(fields) === null;
}
