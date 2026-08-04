import type { SupabaseClient } from "@supabase/supabase-js";

import type { AutomationCycleSummary } from "@/lib/automation/runAutomationCycle";
import type { AutomationRunTriggerSource } from "@/lib/automation/automationRunPersistence";

export type AutomationRunOperationalPriority = AutomationCycleSummary["operationalPriority"];

export type PersistedAutomationRunSummary = {
  id: string;
  ranAt: string;
  triggerSource: AutomationRunTriggerSource;
  status: AutomationCycleSummary["status"];
  operationalPriority: AutomationRunOperationalPriority;
  primarySource: string | null;
  nextAction: string;
  executedActions: number;
  documentActions: number;
  automationErrors: number;
  humanReviewRequired: number;
  recommendation: string;
};

export type AutomationRunHistory = {
  items: PersistedAutomationRunSummary[];
  latestRun: PersistedAutomationRunSummary | null;
  total: number;
  freshnessStatus: "fresh" | "stale" | "missing";
  latestRunAgeHours: number | null;
  staleAfterHours: number;
  freshnessSummary: string;
  recommendedAction: string;
  clean: number;
  attentionRequired: number;
  errors: number;
  normalPriority: number;
  attentionPriority: number;
  urgentPriority: number;
  totalExecutedActions: number;
  totalDocumentActions: number;
  totalHumanReviewRequired: number;
  totalAutomationErrors: number;
  error: string | null;
  summary: string;
};

export async function loadAutomationRunHistory(
  supabase: SupabaseClient,
  input?: {
    limit?: number;
    now?: Date;
    staleAfterHours?: number;
    priority?: AutomationRunOperationalPriority;
  },
): Promise<AutomationRunHistory> {
  const limit = normalizeLimit(input?.limit);
  const staleAfterHours = normalizeStaleAfterHours(input?.staleAfterHours);
  let query = supabase
    .from("operational_automation_runs")
    .select(
      "id,ran_at,trigger_source,status,operational_priority,primary_source,next_action,executed_actions,document_actions,automation_errors,human_review_required,recommendation",
    )
    .order("ran_at", { ascending: false });

  if (input?.priority) {
    query = query.eq("operational_priority", input.priority);
  }

  query = query.limit(limit);
  const { data, error } = await query;

  if (error) {
    if (isMissingPriorityColumnError(error.message)) {
      return loadAutomationRunHistoryLegacy(supabase, {
        limit,
        now: input?.now,
        staleAfterHours,
        priority: input?.priority,
      });
    }

    return emptyHistory(error.message);
  }

  const items = ((data ?? []) as AutomationRunRow[]).map(mapRunRow);
  const freshness = buildFreshness({
    latestRun: items[0] ?? null,
    now: input?.now ?? new Date(),
    staleAfterHours,
  });

  return {
    items,
    latestRun: items[0] ?? null,
    total: items.length,
    ...freshness,
    ...buildMetrics(items),
    error: null,
    summary: buildSummary(items),
  };
}

type AutomationRunRow = {
  id: string;
  ran_at: string;
  trigger_source: AutomationRunTriggerSource;
  status: AutomationCycleSummary["status"];
  operational_priority: AutomationCycleSummary["operationalPriority"];
  primary_source: string | null;
  next_action: string | null;
  executed_actions: number;
  document_actions: number;
  automation_errors: number;
  human_review_required: number;
  recommendation: string;
};

type LegacyAutomationRunRow = Omit<
  AutomationRunRow,
  "operational_priority" | "primary_source" | "next_action"
>;

async function loadAutomationRunHistoryLegacy(
  supabase: SupabaseClient,
  input: {
    limit: number;
    now?: Date;
    staleAfterHours: number;
    priority?: AutomationRunOperationalPriority;
  },
): Promise<AutomationRunHistory> {
  const { data, error } = await supabase
    .from("operational_automation_runs")
    .select(
      "id,ran_at,trigger_source,status,executed_actions,document_actions,automation_errors,human_review_required,recommendation",
    )
    .order("ran_at", { ascending: false })
    .limit(input.limit);

  if (error) return emptyHistory(error.message);

  const items = ((data ?? []) as LegacyAutomationRunRow[])
    .map((row) =>
      mapRunRow({
      ...row,
      operational_priority: priorityFromLegacyRow(row),
      primary_source: null,
      next_action: row.recommendation,
      }),
    )
    .filter((item) => !input.priority || item.operationalPriority === input.priority);
  const freshness = buildFreshness({
    latestRun: items[0] ?? null,
    now: input.now ?? new Date(),
    staleAfterHours: input.staleAfterHours,
  });

  return {
    items,
    latestRun: items[0] ?? null,
    total: items.length,
    ...freshness,
    ...buildMetrics(items),
    error: null,
    summary: buildSummary(items),
  };
}

function mapRunRow(row: AutomationRunRow): PersistedAutomationRunSummary {
  return {
    id: row.id,
    ranAt: row.ran_at,
    triggerSource: row.trigger_source,
    status: row.status,
    operationalPriority: row.operational_priority,
    primarySource: row.primary_source,
    nextAction: row.next_action ?? "",
    executedActions: row.executed_actions,
    documentActions: row.document_actions,
    automationErrors: row.automation_errors,
    humanReviewRequired: row.human_review_required,
    recommendation: row.recommendation,
  };
}

function isMissingPriorityColumnError(message: string): boolean {
  return (
    message.includes("operational_priority") ||
    message.includes("primary_source") ||
    message.includes("next_action")
  );
}

function priorityFromLegacyRow(
  row: LegacyAutomationRunRow,
): AutomationRunOperationalPriority {
  if (row.status === "error" || row.automation_errors > 0) return "urgent";
  if (row.status === "attention_required" || row.human_review_required > 0) {
    return "attention";
  }
  return "normal";
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return 5;
  return Math.min(Math.floor(limit), 50);
}

function normalizeStaleAfterHours(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value <= 0) return 26;
  return Math.min(Math.floor(value), 168);
}

function emptyHistory(error: string | null): AutomationRunHistory {
  return {
    items: [],
    latestRun: null,
    total: 0,
    freshnessStatus: "missing",
    latestRunAgeHours: null,
    staleAfterHours: 26,
    freshnessSummary: error
      ? "No se puede evaluar frescura de automatizacion."
      : "No hay corridas automaticas archivadas para evaluar frescura.",
    recommendedAction: error
      ? "Aplicar migracion de historial o revisar permisos de lectura."
      : "Ejecutar ticker manual o validar que el cron este activo.",
    clean: 0,
    attentionRequired: 0,
    errors: 0,
    normalPriority: 0,
    attentionPriority: 0,
    urgentPriority: 0,
    totalExecutedActions: 0,
    totalDocumentActions: 0,
    totalHumanReviewRequired: 0,
    totalAutomationErrors: 0,
    error,
    summary: error
      ? `Historial de automatizacion pendiente: ${error}`
      : "Sin corridas automaticas archivadas.",
  };
}

function buildFreshness(input: {
  latestRun: PersistedAutomationRunSummary | null;
  now: Date;
  staleAfterHours: number;
}): Pick<
  AutomationRunHistory,
  | "freshnessStatus"
  | "latestRunAgeHours"
  | "staleAfterHours"
  | "freshnessSummary"
  | "recommendedAction"
> {
  if (!input.latestRun) {
    return {
      freshnessStatus: "missing",
      latestRunAgeHours: null,
      staleAfterHours: input.staleAfterHours,
      freshnessSummary: "No hay corridas automaticas archivadas para evaluar frescura.",
      recommendedAction: "Ejecutar ticker manual o validar que el cron este activo.",
    };
  }

  const ageHours = Math.max(
    0,
    Math.round((input.now.getTime() - new Date(input.latestRun.ranAt).getTime()) / 3_600_000),
  );
  const stale = ageHours > input.staleAfterHours;

  return {
    freshnessStatus: stale ? "stale" : "fresh",
    latestRunAgeHours: ageHours,
    staleAfterHours: input.staleAfterHours,
    freshnessSummary: stale
      ? `Ultima corrida hace ${ageHours} hora(s); automatizacion atrasada.`
      : `Ultima corrida hace ${ageHours} hora(s); automatizacion vigente.`,
    recommendedAction: stale
      ? "Ejecutar ticker manual y revisar configuracion del cron."
      : "Mantener monitoreo normal.",
  };
}

function buildMetrics(items: PersistedAutomationRunSummary[]) {
  return {
    clean: items.filter((item) => item.status === "clean").length,
    attentionRequired: items.filter((item) => item.status === "attention_required").length,
    errors: items.filter((item) => item.status === "error").length,
    normalPriority: items.filter((item) => item.operationalPriority === "normal").length,
    attentionPriority: items.filter((item) => item.operationalPriority === "attention").length,
    urgentPriority: items.filter((item) => item.operationalPriority === "urgent").length,
    totalExecutedActions: sum(items, "executedActions"),
    totalDocumentActions: sum(items, "documentActions"),
    totalHumanReviewRequired: sum(items, "humanReviewRequired"),
    totalAutomationErrors: sum(items, "automationErrors"),
  };
}

function sum(
  items: PersistedAutomationRunSummary[],
  key: "executedActions" | "documentActions" | "humanReviewRequired" | "automationErrors",
): number {
  return items.reduce((total, item) => total + item[key], 0);
}

function buildSummary(items: PersistedAutomationRunSummary[]): string {
  if (!items.length) return "Sin corridas automaticas archivadas.";

  const latest = items[0];
  if (latest.automationErrors > 0) {
    return `Ultima corrida con ${latest.automationErrors} error(es) de automatizacion.`;
  }

  if (latest.humanReviewRequired > 0) {
    return `Ultima corrida dejo ${latest.humanReviewRequired} revision(es) humanas pendientes.`;
  }

  return `Ultima corrida limpia con ${latest.executedActions} accion(es) ejecutadas.`;
}
