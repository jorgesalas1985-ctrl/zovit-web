/** Fechas en formato chileno día/mes/año (dd/mm/aaaa). */

const DMY_RE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidChileanDate(value: string): boolean {
  return chileanDateToIso(value) !== null;
}

/** Convierte dd/mm/aaaa (también dd-mm-aaaa) o yyyy-mm-dd a ISO yyyy-mm-dd. */
export function chileanDateToIso(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const iso = raw.match(ISO_RE);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isRealDate(year, month, day) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }

  const dmy = raw.match(DMY_RE);
  if (!dmy) return null;
  const day = Number(dmy[1]);
  const month = Number(dmy[2]);
  const year = Number(dmy[3]);
  if (!isRealDate(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Convierte yyyy-mm-dd (o dd/mm/aaaa) a dd/mm/aaaa para mostrar. */
export function isoToChileanDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const iso = chileanDateToIso(raw);
  if (!iso) return raw;
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
