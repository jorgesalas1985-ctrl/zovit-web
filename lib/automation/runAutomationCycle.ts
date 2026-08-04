import { isAiConfigured } from "@/lib/ai/provider";
import { processPendingIdentityAiReviews } from "@/lib/verification/processIdentityAiReview";
import { processPendingWorkerAiReviews } from "@/lib/worker/processWorkerAiBatch";
import { processUnmatchedPublishedRequests } from "@/lib/automation/inviteProfessionals";
import { reconcilePendingMercadoPagoPayments } from "@/lib/automation/reconcilePayments";
import {
  processLocalOcrBatch,
  type LocalOcrBatchResult,
} from "@/lib/operations/localOcrBatch";
import {
  loadDocumentEventInbox,
  type DocumentEventInbox,
} from "@/lib/operations/documentEventInbox";
import {
  prepareDocumentSuspensionEvents,
  type DocumentSuspensionPreparationResult,
} from "@/lib/operations/documentSuspensionPreparation";
import {
  prepareDocumentRenewalReminderEvents,
  type DocumentRenewalReminderPreparationResult,
} from "@/lib/operations/documentRenewalReminderPreparation";
import {
  createDocumentEventNotifications,
  type DocumentNotificationBridgeResult,
} from "@/lib/operations/documentNotificationBridge";
import {
  closeResolvedDocumentNotificationsBatch,
  type DocumentNotificationCleanupBatchResult,
} from "@/lib/operations/documentNotificationCleanupBatch";
import { createAdminClient } from "@/lib/supabase/admin";

export type AutomationCycleSummary = {
  status: "clean" | "attention_required" | "error";
  operationalPriority: "normal" | "attention" | "urgent";
  primarySource: string | null;
  nextAction: string;
  executedActions: number;
  documentActions: number;
  automationErrors: number;
  errorSources: string[];
  humanReviewRequired: number;
  humanReviewSources: string[];
  recommendation: string;
};

type AutomationCyclePayload = {
  ranAt: string;
  openaiConfigured: boolean;
  identity: Awaited<ReturnType<typeof processPendingIdentityAiReviews>>;
  workers: Awaited<ReturnType<typeof processPendingWorkerAiReviews>>;
  matching: Awaited<ReturnType<typeof processUnmatchedPublishedRequests>>;
  payments: Awaited<ReturnType<typeof reconcilePendingMercadoPagoPayments>>;
  localOcr: LocalOcrBatchResult;
  documentReminders: DocumentRenewalReminderPreparationResult;
  documentSuspensions: DocumentSuspensionPreparationResult;
  documentNotifications: DocumentNotificationBridgeResult;
  documentNotificationCleanup: DocumentNotificationCleanupBatchResult;
  documentEvents: DocumentEventInbox;
};

export type AutomationCycleResult = AutomationCyclePayload & {
  summary: AutomationCycleSummary;
};

export async function runAutomationCycle(options?: {
  identityLimit?: number;
  workerLimit?: number;
  matchLimit?: number;
  paymentLimit?: number;
  localOcrLimit?: number;
  documentReminderLimit?: number;
  documentSuspensionLimit?: number;
  documentNotificationLimit?: number;
  documentNotificationCleanupLimit?: number;
}): Promise<AutomationCycleResult> {
  const openaiConfigured = isAiConfigured();

  const [
    identity,
    workers,
    matching,
    payments,
    localOcr,
    documentReminders,
    documentSuspensions,
  ] =
    await Promise.all([
      openaiConfigured
        ? processPendingIdentityAiReviews(options?.identityLimit ?? 6)
        : Promise.resolve({ processed: 0, approved: 0, rejected: 0, dudoso: 0 }),
      openaiConfigured
        ? processPendingWorkerAiReviews(options?.workerLimit ?? 6)
        : Promise.resolve({ processed: 0, approved: 0, rejected: 0, dudosos: 0 }),
      processUnmatchedPublishedRequests(options?.matchLimit ?? 10),
      reconcilePendingMercadoPagoPayments(options?.paymentLimit ?? 10),
      runLocalOcrAutomation(options?.localOcrLimit ?? 3),
      runDocumentReminderAutomation(options?.documentReminderLimit ?? 50),
      runDocumentSuspensionAutomation(options?.documentSuspensionLimit ?? 50),
    ]);
  const documentNotifications = await runDocumentNotificationAutomation(
    options?.documentNotificationLimit ?? 50,
  );
  const documentNotificationCleanup = await runDocumentNotificationCleanupAutomation(
    options?.documentNotificationCleanupLimit ?? 50,
  );
  const documentEvents = await runDocumentEventInboxAutomation(5);

  const payload: AutomationCyclePayload = {
    ranAt: new Date().toISOString(),
    openaiConfigured,
    identity,
    workers,
    matching,
    payments,
    localOcr,
    documentReminders,
    documentSuspensions,
    documentNotifications,
    documentNotificationCleanup,
    documentEvents,
  };

  return {
    ...payload,
    summary: buildAutomationCycleSummary(payload),
  };
}

export function buildAutomationCycleSummary(
  result: AutomationCyclePayload,
): AutomationCycleSummary {
  const identityProcessed = getNumber(result.identity, "processed");
  const workerProcessed = getNumber(result.workers, "processed");
  const matchingProcessed = getNumber(result.matching, "processed");
  const matchingInvited = getNumber(result.matching, "invited");
  const paymentsConfirmed = getNumber(result.payments, "confirmed");

  const documentActions =
    result.localOcr.completed +
    result.localOcr.manualReview +
    result.documentReminders.prepared +
    result.documentSuspensions.prepared +
    result.documentNotifications.created +
    result.documentNotificationCleanup.closed;

  const executedActions =
    identityProcessed +
    workerProcessed +
    matchingProcessed +
    matchingInvited +
    paymentsConfirmed +
    documentActions;

  const errorSources = buildErrorSources(result);
  const humanReviewSources = buildHumanReviewSources(result);
  const automationErrors = errorSources.length;
  const humanReviewRequired = humanReviewSources.reduce(
    (total, source) => total + source.count,
    0,
  );

  const status =
    automationErrors > 0
      ? "error"
      : humanReviewRequired > 0
        ? "attention_required"
        : "clean";
  const decision = buildOperationalDecision({
    result,
    status,
    automationErrors,
    errorSources,
    humanReviewRequired,
    humanReviewSources: humanReviewSources.map((source) => source.label),
  });

  return {
    status,
    ...decision,
    executedActions,
    documentActions,
    automationErrors,
    errorSources,
    humanReviewRequired,
    humanReviewSources: humanReviewSources.map((source) => source.label),
    recommendation: buildAutomationRecommendation({
      executedActions,
      documentActions,
      automationErrors,
      errorSources,
      humanReviewRequired,
      humanReviewSources: humanReviewSources.map((source) => source.label),
    }),
  };
}

function buildOperationalDecision(input: {
  result: AutomationCyclePayload;
  status: AutomationCycleSummary["status"];
  automationErrors: number;
  errorSources: string[];
  humanReviewRequired: number;
  humanReviewSources: string[];
}): Pick<AutomationCycleSummary, "operationalPriority" | "primarySource" | "nextAction"> {
  if (input.automationErrors > 0) {
    const primarySource = input.errorSources[0] ?? "automatizacion";
    return {
      operationalPriority: "urgent",
      primarySource,
      nextAction: `Revisar error en ${primarySource} antes de confiar en la corrida.`,
    };
  }

  if (
    input.result.documentSuspensions.prepared > 0 ||
    input.result.documentEvents.critical > 0
  ) {
    return {
      operationalPriority: "urgent",
      primarySource: "riesgo_documental",
      nextAction: "Revisar perfiles listos para suspension documental.",
    };
  }

  if (input.humanReviewRequired > 0) {
    const primarySource = input.humanReviewSources[0] ?? "revision_humana";
    return {
      operationalPriority: "attention",
      primarySource,
      nextAction: `Atender cola de ${primarySource}.`,
    };
  }

  if (input.result.documentReminders.prepared > 0) {
    return {
      operationalPriority: "attention",
      primarySource: "recordatorios_documentales",
      nextAction: "Monitorear renovaciones documentales notificadas.",
    };
  }

  if (input.status === "clean") {
    return {
      operationalPriority: "normal",
      primarySource: null,
      nextAction: "Mantener automatizacion activa y monitoreo normal.",
    };
  }

  return {
    operationalPriority: "attention",
    primarySource: "automatizacion",
    nextAction: "Revisar resumen de automatizacion.",
  };
}

function buildErrorSources(result: AutomationCyclePayload): string[] {
  const sources: string[] = [];

  if (getString(result.matching, "error")) sources.push("matching");
  if (result.localOcr.error) sources.push("ocr_local");
  if (result.documentReminders.error) sources.push("recordatorios_documentales");
  if (result.documentSuspensions.error) sources.push("suspensiones_documentales");
  if (result.documentNotifications.error) sources.push("notificaciones_documentales");
  if (result.documentNotificationCleanup.error) sources.push("limpieza_notificaciones");
  if (result.documentEvents.error) sources.push("eventos_documentales");

  return sources;
}

function buildHumanReviewSources(
  result: AutomationCyclePayload,
): Array<{ label: string; count: number }> {
  return [
    { label: "identidad_dudosa", count: getNumber(result.identity, "dudoso") },
    { label: "trabajadores_dudosos", count: getNumber(result.workers, "dudosos") },
    { label: "ocr_revision_manual", count: result.localOcr.manualReview },
    { label: "eventos_documentales_humanos", count: result.documentEvents.humanActionRequired },
  ].filter((source) => source.count > 0);
}

function getNumber(input: unknown, key: string): number {
  if (!input || typeof input !== "object" || !(key in input)) return 0;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getString(input: unknown, key: string): string | null {
  if (!input || typeof input !== "object" || !(key in input)) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function buildAutomationRecommendation(
  input: Pick<
    AutomationCycleSummary,
    | "executedActions"
    | "documentActions"
    | "automationErrors"
    | "errorSources"
    | "humanReviewRequired"
    | "humanReviewSources"
  >,
) {
  if (input.automationErrors > 0) {
    return `Revisar ${input.automationErrors} error(es) del ciclo automatico antes de confiar en la corrida.`;
  }

  if (input.humanReviewRequired > 0) {
    return `Atender ${input.humanReviewRequired} elemento(s) con revision humana o prioridad documental.`;
  }

  if (input.executedActions > 0) {
    return `Ciclo automatico ejecutado correctamente con ${input.executedActions} accion(es).`;
  }

  return "Ciclo automatico limpio: no habia acciones pendientes.";
}

async function runLocalOcrAutomation(limit: number): Promise<LocalOcrBatchResult> {
  try {
    return processLocalOcrBatch({
      supabase: createAdminClient(),
      limit,
      actorType: "operations",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado en OCR local.";
    return {
      attempted: 0,
      completed: 0,
      manualReview: 0,
      failed: 0,
      skipped: 0,
      items: [],
      error: message,
      summary: `No se pudo ejecutar OCR local automatico: ${message}`,
    };
  }
}

async function runDocumentEventInboxAutomation(limit: number): Promise<DocumentEventInbox> {
  try {
    return loadDocumentEventInbox(createAdminClient(), { limit });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado en eventos documentales.";

    return {
      items: [],
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      humanActionRequired: 0,
      automaticFollowUps: 0,
      error: message,
      summary: `No se pudo cargar bandeja documental automatica: ${message}`,
    };
  }
}

async function runDocumentReminderAutomation(
  limit: number,
): Promise<DocumentRenewalReminderPreparationResult> {
  try {
    return prepareDocumentRenewalReminderEvents({
      supabase: createAdminClient(),
      limit,
      actorType: "system",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado en recordatorios documentales.";

    return {
      checked: 0,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: message,
      summary: `No se pudo preparar recordatorio documental automatico: ${message}`,
    };
  }
}

async function runDocumentNotificationAutomation(
  limit: number,
): Promise<DocumentNotificationBridgeResult> {
  try {
    return createDocumentEventNotifications({
      supabase: createAdminClient(),
      limit,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado en notificaciones documentales.";

    return {
      checked: 0,
      created: 0,
      skipped: 0,
      notificationIds: [],
      error: message,
      summary: `No se pudieron crear notificaciones documentales automaticas: ${message}`,
    };
  }
}

async function runDocumentNotificationCleanupAutomation(
  limit: number,
): Promise<DocumentNotificationCleanupBatchResult> {
  try {
    return closeResolvedDocumentNotificationsBatch({
      supabase: createAdminClient(),
      limit,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado en limpieza de avisos documentales.";

    return {
      checkedProfiles: 0,
      closed: 0,
      failed: 0,
      items: [],
      error: message,
      summary: `No se pudieron limpiar avisos documentales automaticos: ${message}`,
    };
  }
}

async function runDocumentSuspensionAutomation(
  limit: number,
): Promise<DocumentSuspensionPreparationResult> {
  try {
    return prepareDocumentSuspensionEvents({
      supabase: createAdminClient(),
      limit,
      actorType: "system",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado en preparacion documental.";

    return {
      checked: 0,
      prepared: 0,
      skipped: 0,
      eventIds: [],
      error: message,
      summary: `No se pudo preparar suspension documental automatica: ${message}`,
    };
  }
}
