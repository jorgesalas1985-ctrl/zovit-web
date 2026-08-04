import type { SupabaseClient } from "@supabase/supabase-js";

import type { AutomationCycleResult } from "@/lib/automation/runAutomationCycle";

export type AutomationRunTriggerSource = "cron" | "manual" | "ticker" | "system";

export type OperationalAutomationRunInsert = {
  run_key: string;
  ran_at: string;
  trigger_source: AutomationRunTriggerSource;
  status: AutomationCycleResult["summary"]["status"];
  operational_priority: AutomationCycleResult["summary"]["operationalPriority"];
  primary_source: string | null;
  next_action: string;
  openai_configured: boolean;
  executed_actions: number;
  document_actions: number;
  automation_errors: number;
  human_review_required: number;
  error_sources: string[];
  human_review_sources: string[];
  recommendation: string;
  summary: AutomationCycleResult["summary"];
  result: AutomationCycleResult;
  created_by?: string | null;
};

export type PersistAutomationRunResult = {
  runId: string | null;
  error: string | null;
};

export function buildOperationalAutomationRunInsert(input: {
  result: AutomationCycleResult;
  triggerSource: AutomationRunTriggerSource;
  userId?: string | null;
}): OperationalAutomationRunInsert {
  const summary = input.result.summary;

  return {
    run_key: buildRunKey(input.result.ranAt, input.triggerSource),
    ran_at: input.result.ranAt,
    trigger_source: input.triggerSource,
    status: summary.status,
    operational_priority: summary.operationalPriority,
    primary_source: summary.primarySource,
    next_action: summary.nextAction,
    openai_configured: input.result.openaiConfigured,
    executed_actions: summary.executedActions,
    document_actions: summary.documentActions,
    automation_errors: summary.automationErrors,
    human_review_required: summary.humanReviewRequired,
    error_sources: summary.errorSources,
    human_review_sources: summary.humanReviewSources,
    recommendation: summary.recommendation,
    summary,
    result: input.result,
    created_by: input.userId ?? null,
  };
}

export async function persistOperationalAutomationRun(input: {
  supabase: SupabaseClient;
  result: AutomationCycleResult;
  triggerSource: AutomationRunTriggerSource;
  userId?: string | null;
}): Promise<PersistAutomationRunResult> {
  const insert = buildOperationalAutomationRunInsert({
    result: input.result,
    triggerSource: input.triggerSource,
    userId: input.userId,
  });

  const { data, error } = await input.supabase
    .from("operational_automation_runs")
    .insert(insert)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      runId: null,
      error: error.message,
    };
  }

  return {
    runId: (data as { id?: string } | null)?.id ?? null,
    error: null,
  };
}

export async function persistOperationalAutomationRunBestEffort(input: {
  createSupabase: () => SupabaseClient;
  result: AutomationCycleResult;
  triggerSource: AutomationRunTriggerSource;
  userId?: string | null;
}): Promise<PersistAutomationRunResult> {
  try {
    return await persistOperationalAutomationRun({
      supabase: input.createSupabase(),
      result: input.result,
      triggerSource: input.triggerSource,
      userId: input.userId,
    });
  } catch (error) {
    return {
      runId: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo persistir corrida automatica.",
    };
  }
}

function buildRunKey(ranAt: string, triggerSource: AutomationRunTriggerSource): string {
  return ["automation-run", triggerSource, ranAt].join(":");
}
