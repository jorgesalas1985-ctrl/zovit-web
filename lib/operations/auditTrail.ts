import type { ExecutionPolicyDecision, ExecutionPolicyItem } from "@/lib/operations/executionPolicy";

export type OperationalAuditEventType =
  | "action_ready"
  | "action_retained_manual"
  | "action_retained_superadmin"
  | "action_blocked";

export type OperationalAuditEvent = {
  id: string;
  queueItemId: string;
  actionKind: string;
  eventType: OperationalAuditEventType;
  title: string;
  summary: string;
  actorType: "system" | "human" | "superadmin";
  createdAt: string;
  metadata: {
    status: string;
    canExecuteNow: boolean;
    reasons: string[];
  };
};

export type OperationalAuditTrail = {
  events: OperationalAuditEvent[];
  readyCount: number;
  retainedCount: number;
  blockedCount: number;
  summary: string;
};

export function buildOperationalAuditTrail(input: {
  policy: ExecutionPolicyDecision;
  now?: Date;
}): OperationalAuditTrail {
  const createdAt = (input.now ?? new Date()).toISOString();
  const events = input.policy.items.map((item) => eventFromPolicyItem(item, createdAt));
  const readyCount = events.filter((event) => event.eventType === "action_ready").length;
  const retainedCount = events.filter((event) =>
    event.eventType === "action_retained_manual" ||
    event.eventType === "action_retained_superadmin",
  ).length;
  const blockedCount = events.filter((event) => event.eventType === "action_blocked").length;

  return {
    events,
    readyCount,
    retainedCount,
    blockedCount,
    summary: summaryFromEvents({ total: events.length, readyCount, retainedCount, blockedCount }),
  };
}

function eventFromPolicyItem(
  item: ExecutionPolicyItem,
  createdAt: string,
): OperationalAuditEvent {
  const eventType = eventTypeFromPolicyItem(item);

  return {
    id: `${item.queueItemId}:${eventType}`,
    queueItemId: item.queueItemId,
    actionKind: item.kind,
    eventType,
    title: item.title,
    summary: item.summary,
    actorType: actorTypeFromEventType(eventType),
    createdAt,
    metadata: {
      status: item.status,
      canExecuteNow: item.canExecuteNow,
      reasons: item.reasons,
    },
  };
}

function eventTypeFromPolicyItem(item: ExecutionPolicyItem): OperationalAuditEventType {
  if (item.status === "blocked") return "action_blocked";
  if (item.status === "requires_superadmin_approval") return "action_retained_superadmin";
  if (item.status === "requires_manual_action") return "action_retained_manual";
  return "action_ready";
}

function actorTypeFromEventType(eventType: OperationalAuditEventType): OperationalAuditEvent["actorType"] {
  if (eventType === "action_retained_superadmin") return "superadmin";
  if (eventType === "action_retained_manual") return "human";
  return "system";
}

function summaryFromEvents(input: {
  total: number;
  readyCount: number;
  retainedCount: number;
  blockedCount: number;
}): string {
  if (input.total === 0) {
    return "No hay eventos operativos para auditar.";
  }

  if (input.blockedCount > 0) {
    return `${input.blockedCount} evento operativo quedo bloqueado.`;
  }

  if (input.retainedCount > 0) {
    return `${input.retainedCount} evento operativo quedo retenido para revision.`;
  }

  return `${input.readyCount} evento operativo esta listo para ejecucion auditada.`;
}
