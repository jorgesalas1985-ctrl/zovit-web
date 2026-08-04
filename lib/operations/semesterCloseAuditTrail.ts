import type {
  SemesterCloseExecutionItem,
  SemesterCloseExecutionPolicy,
} from "@/lib/operations/semesterCloseExecutionPolicy";

export type SemesterCloseAuditEventType =
  | "close_action_prepared"
  | "close_action_retained_manual"
  | "close_action_retained_superadmin";

export type SemesterCloseAuditEvent = {
  id: string;
  actionId: string;
  eventType: SemesterCloseAuditEventType;
  title: string;
  summary: string;
  actorType: "operations" | "human" | "superadmin";
  createdAt: string;
  metadata: {
    status: string;
    canExecuteAutomatically: false;
    reasons: string[];
  };
};

export type SemesterCloseAuditTrail = {
  events: SemesterCloseAuditEvent[];
  preparedCount: number;
  retainedCount: number;
  superadminCount: number;
  summary: string;
};

export function buildSemesterCloseAuditTrail(input: {
  policy: SemesterCloseExecutionPolicy;
  now?: Date;
}): SemesterCloseAuditTrail {
  const createdAt = (input.now ?? new Date()).toISOString();
  const events = input.policy.items.map((item) =>
    eventFromPolicyItem(item, createdAt),
  );
  const preparedCount = events.filter(
    (event) => event.eventType === "close_action_prepared",
  ).length;
  const superadminCount = events.filter(
    (event) => event.eventType === "close_action_retained_superadmin",
  ).length;
  const retainedCount = events.length - preparedCount;

  return {
    events,
    preparedCount,
    retainedCount,
    superadminCount,
    summary: summaryFromEvents({
      total: events.length,
      preparedCount,
      retainedCount,
      superadminCount,
    }),
  };
}

function eventFromPolicyItem(
  item: SemesterCloseExecutionItem,
  createdAt: string,
): SemesterCloseAuditEvent {
  const eventType = eventTypeFromPolicyItem(item);

  return {
    id: `${item.id}:${eventType}`,
    actionId: item.id,
    eventType,
    title: item.title,
    summary: item.summary,
    actorType: actorTypeFromEventType(eventType),
    createdAt,
    metadata: {
      status: item.status,
      canExecuteAutomatically: item.canExecuteAutomatically,
      reasons: item.reasons,
    },
  };
}

function eventTypeFromPolicyItem(
  item: SemesterCloseExecutionItem,
): SemesterCloseAuditEventType {
  if (item.status === "requires_superadmin_approval") {
    return "close_action_retained_superadmin";
  }

  if (item.status === "requires_manual_action") {
    return "close_action_retained_manual";
  }

  return "close_action_prepared";
}

function actorTypeFromEventType(
  eventType: SemesterCloseAuditEventType,
): SemesterCloseAuditEvent["actorType"] {
  if (eventType === "close_action_retained_superadmin") return "superadmin";
  if (eventType === "close_action_retained_manual") return "human";
  return "operations";
}

function summaryFromEvents(input: {
  total: number;
  preparedCount: number;
  retainedCount: number;
  superadminCount: number;
}): string {
  if (input.total === 0) {
    return "No hay eventos de cierre para auditar.";
  }

  if (input.superadminCount > 0) {
    return `${input.superadminCount} evento de cierre quedo retenido para SUPERADMIN.`;
  }

  if (input.retainedCount > 0) {
    return `${input.retainedCount} evento de cierre quedo retenido para trabajo humano.`;
  }

  return `${input.preparedCount} evento de cierre quedo preparado para auditoria.`;
}
