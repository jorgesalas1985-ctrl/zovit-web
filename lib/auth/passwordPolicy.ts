export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 12;

export const PASSWORD_HINT =
  "Entre 8 y 12 caracteres. Puede incluir letras, números y signos.";

export function validatePasswordForCreate(password: string): string | null {
  const value = password.trim();

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`;
  }

  return null;
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeAuthPassword(password: string): string {
  return password.trim();
}
