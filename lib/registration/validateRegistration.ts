export type RegistrationProfileFields = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  commune: string;
  rut: string;
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
};

/** Normaliza RUT chileno a formato 12345678-9 */
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
  return `${body}-${dv}`;
}

/** Valida dígito verificador del RUT chileno. */
export function isValidChileanRut(value: string): boolean {
  const normalized = normalizeChileanRut(value);
  const match = normalized.match(/^(\d{7,8})-([\dK])$/);
  if (!match) return false;

  const body = match[1];
  const dv = match[2];
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
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
    return "Ingresa un RUT válido. Formatos: 123456785 · 12.345.678-5 · 12345678-5";
  }

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
