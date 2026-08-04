import type {
  SemesterCloseActionItem,
  SemesterCloseActionOwner,
  SemesterCloseActionPriority,
} from "@/lib/operations/semesterCloseActionItems";

export type SemesterCloseActionSummary = {
  total: number;
  byPriority: Record<SemesterCloseActionPriority, number>;
  byOwner: Record<SemesterCloseActionOwner, number>;
  highestPriority: SemesterCloseActionPriority | null;
  summary: string;
};

export function summarizeSemesterCloseActions(
  items: SemesterCloseActionItem[],
): SemesterCloseActionSummary {
  const byPriority = {
    critical: countBy(items, "priority", "critical"),
    high: countBy(items, "priority", "high"),
    medium: countBy(items, "priority", "medium"),
    low: countBy(items, "priority", "low"),
  };
  const byOwner = {
    operations: countBy(items, "owner", "operations"),
    superadmin: countBy(items, "owner", "superadmin"),
  };
  const highestPriority = resolveHighestPriority(byPriority);

  return {
    total: items.length,
    byPriority,
    byOwner,
    highestPriority,
    summary: summaryFromCounts(items.length, byPriority, byOwner),
  };
}

function countBy<
  TKey extends "priority" | "owner",
  TValue extends SemesterCloseActionItem[TKey],
>(items: SemesterCloseActionItem[], key: TKey, value: TValue): number {
  return items.filter((item) => item[key] === value).length;
}

function resolveHighestPriority(
  counts: Record<SemesterCloseActionPriority, number>,
): SemesterCloseActionPriority | null {
  if (counts.critical > 0) return "critical";
  if (counts.high > 0) return "high";
  if (counts.medium > 0) return "medium";
  if (counts.low > 0) return "low";
  return null;
}

function summaryFromCounts(
  total: number,
  byPriority: Record<SemesterCloseActionPriority, number>,
  byOwner: Record<SemesterCloseActionOwner, number>,
): string {
  if (total === 0) {
    return "No hay acciones recomendadas para el cierre.";
  }

  if (byPriority.critical > 0) {
    return `${byPriority.critical} accion critica debe resolverse antes de cerrar.`;
  }

  if (byOwner.superadmin > 0) {
    return `${byOwner.superadmin} accion requiere intervencion SUPERADMIN.`;
  }

  if (byPriority.high > 0) {
    return `${byPriority.high} accion de prioridad alta requiere seguimiento operativo.`;
  }

  return `${total} accion recomendada permite preparar el cierre.`;
}
