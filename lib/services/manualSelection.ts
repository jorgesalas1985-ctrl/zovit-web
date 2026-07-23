export type ManualServiceSelection = {
  source: "manual";
  category: string;
  categorySlug: string;
  subcategory: string;
  subcategorySlug: string;
  specialty: string;
  description: string;
  referencePrice?: string;
  professionalId?: string;
  commune?: string;
};

export const MANUAL_SELECTION_KEY = "zovit_manual_selection";

export function saveManualSelection(selection: ManualServiceSelection): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MANUAL_SELECTION_KEY, JSON.stringify(selection));
}

export function loadManualSelection(): ManualServiceSelection | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(MANUAL_SELECTION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ManualServiceSelection;
  } catch {
    return null;
  }
}

export function clearManualSelection(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MANUAL_SELECTION_KEY);
}

export function buildManualDescription(
  subcategoryLabel: string,
  categoryName: string,
): string {
  return `Solicitud de ${subcategoryLabel} (${categoryName}) seleccionada manualmente en ZOVIT.`;
}
