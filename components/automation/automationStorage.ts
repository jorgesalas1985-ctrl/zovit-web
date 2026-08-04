export const AUTOMATION_TICK_STORAGE_KEY = "zovit_automation_tick_at";
export const AUTOMATION_SUMMARY_STORAGE_KEY = "zovit_automation_last_summary";

export type StoredAutomationSummary = {
  ranAt?: string;
  status?: string;
  operationalPriority?: string;
  primarySource?: string | null;
  nextAction?: string;
  executedActions?: number;
  documentActions?: number;
  automationErrors?: number;
  errorSources?: string[];
  humanReviewRequired?: number;
  humanReviewSources?: string[];
  recommendation?: string;
};
