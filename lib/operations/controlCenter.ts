import type {
  ReviewQueueDecision,
  ReviewQueueItem,
  ReviewQueueItemType,
  ReviewQueuePriority,
} from "@/lib/operations/reviewQueue";

export type ControlCenterProfileQueue = {
  profileId: string;
  displayName: string;
  queue: ReviewQueueDecision;
};

export type ControlCenterMetric = {
  label: string;
  value: number;
};

export type ControlCenterDecision = {
  totalProfiles: number;
  totalItems: number;
  requiresHumanAction: number;
  highestPriority: ReviewQueuePriority | null;
  priorityMetrics: Record<ReviewQueuePriority, number>;
  typeMetrics: Record<ReviewQueueItemType, number>;
  topItems: Array<ReviewQueueItem & { profileId: string; displayName: string }>;
  summary: string;
};

const PRIORITIES: ReviewQueuePriority[] = ["critical", "high", "medium", "low"];

const ITEM_TYPES: ReviewQueueItemType[] = [
  "document_renewal",
  "manual_document_review",
  "account_suspension",
  "technical_evaluation",
  "second_review",
  "sensitive_automation",
];

const PRIORITY_SCORE: Record<ReviewQueuePriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function buildControlCenter(input: {
  profiles: ControlCenterProfileQueue[];
  topItemLimit?: number;
}): ControlCenterDecision {
  const priorityMetrics = zeroPriorityMetrics();
  const typeMetrics = zeroTypeMetrics();
  const topItemLimit = input.topItemLimit ?? 10;

  const allItems = input.profiles.flatMap((profile) =>
    profile.queue.items.map((item) => ({
      ...item,
      profileId: profile.profileId,
      displayName: profile.displayName,
    })),
  );

  for (const item of allItems) {
    priorityMetrics[item.priority] += 1;
    typeMetrics[item.type] += 1;
  }

  const sortedItems = [...allItems].sort((left, right) => {
    const priorityDiff = PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (left.dueAt ?? "9999-12-31").localeCompare(right.dueAt ?? "9999-12-31");
  });

  const highestPriority = sortedItems[0]?.priority ?? null;
  const requiresHumanAction = allItems.filter((item) => item.requiresHumanAction).length;

  return {
    totalProfiles: input.profiles.length,
    totalItems: allItems.length,
    requiresHumanAction,
    highestPriority,
    priorityMetrics,
    typeMetrics,
    topItems: sortedItems.slice(0, topItemLimit),
    summary: summaryFromControlCenter({
      totalItems: allItems.length,
      requiresHumanAction,
      priorityMetrics,
    }),
  };
}

function zeroPriorityMetrics(): Record<ReviewQueuePriority, number> {
  return PRIORITIES.reduce(
    (metrics, priority) => ({ ...metrics, [priority]: 0 }),
    {} as Record<ReviewQueuePriority, number>,
  );
}

function zeroTypeMetrics(): Record<ReviewQueueItemType, number> {
  return ITEM_TYPES.reduce(
    (metrics, type) => ({ ...metrics, [type]: 0 }),
    {} as Record<ReviewQueueItemType, number>,
  );
}

function summaryFromControlCenter(input: {
  totalItems: number;
  requiresHumanAction: number;
  priorityMetrics: Record<ReviewQueuePriority, number>;
}): string {
  if (input.totalItems === 0) {
    return "El centro de control no registra pendientes operativos.";
  }

  if (input.priorityMetrics.critical > 0) {
    return `${input.priorityMetrics.critical} pendiente critico requiere atencion inmediata.`;
  }

  if (input.requiresHumanAction > 0) {
    return `${input.requiresHumanAction} pendiente requiere accion humana.`;
  }

  return `${input.totalItems} seguimiento operativo puede automatizarse.`;
}
