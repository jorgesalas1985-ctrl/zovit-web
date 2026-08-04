import { chileanDateToIso } from "@/lib/ui/chileanDate";

/** Edad mínima legal para operar en ZOVIT (Chile). */
export const MIN_AGE_CHILE = 18;

export const ADULT_AGE_ERROR =
  "Debes ser mayor de 18 años para registrarte en ZOVIT (Chile).";

export const BIRTH_DATE_REQUIRED_ERROR =
  "Ingresa tu fecha de nacimiento (dd/mm/aaaa). Debes ser mayor de 18 años.";

/** Fecha de calendario en zona America/Santiago (YYYY-MM-DD). */
export function chileCalendarDate(today = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
}

/** Edad en años cumplidos según calendario Chile. */
export function getAgeInYears(isoBirthDate: string, today = new Date()): number | null {
  const iso = chileanDateToIso(isoBirthDate);
  if (!iso) return null;

  const [birthYear, birthMonth, birthDay] = iso.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = chileCalendarDate(today).split("-").map(Number);

  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
    age -= 1;
  }
  return age;
}

export function isAdultInChile(birthDateInput: string, today = new Date()): boolean {
  const age = getAgeInYears(birthDateInput, today);
  return age != null && age >= MIN_AGE_CHILE && age <= 120;
}

/** Devuelve mensaje de error o null si la fecha es válida y el usuario es mayor de edad. */
export function validateAdultBirthDate(birthDateInput: string, today = new Date()): string | null {
  const iso = chileanDateToIso(birthDateInput);
  if (!iso) {
    return "Fecha de nacimiento inválida. Usa día/mes/año, ej: 15/03/1990.";
  }

  const age = getAgeInYears(iso, today);
  if (age == null || age < 0) {
    return "La fecha de nacimiento no puede ser futura.";
  }
  if (age > 120) {
    return "Revisa la fecha de nacimiento ingresada.";
  }
  if (age < MIN_AGE_CHILE) {
    return ADULT_AGE_ERROR;
  }
  return null;
}
