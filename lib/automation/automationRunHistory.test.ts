import assert from "node:assert/strict";
import test from "node:test";

import { loadAutomationRunHistory } from "@/lib/automation/automationRunHistory";

function queryResult(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return Promise.resolve({ data, error });
    },
  };
}

test("loads lightweight automation run history", async () => {
  const supabase = {
    from(table: string) {
      assert.equal(table, "operational_automation_runs");
      return queryResult([
        {
          id: "run-1",
          ran_at: "2026-08-01T12:00:00.000Z",
          trigger_source: "cron",
          status: "attention_required",
          operational_priority: "attention",
          primary_source: "eventos_documentales_humanos",
          next_action: "Atender cola documental.",
          executed_actions: 8,
          document_actions: 5,
          automation_errors: 0,
          human_review_required: 2,
          recommendation: "Atender 2 revisiones.",
        },
        {
          id: "run-2",
          ran_at: "2026-07-31T12:00:00.000Z",
          trigger_source: "ticker",
          status: "clean",
          operational_priority: "normal",
          primary_source: null,
          next_action: "Mantener monitoreo normal.",
          executed_actions: 3,
          document_actions: 1,
          automation_errors: 0,
          human_review_required: 0,
          recommendation: "Corrida limpia.",
        },
        {
          id: "run-3",
          ran_at: "2026-07-30T12:00:00.000Z",
          trigger_source: "cron",
          status: "error",
          operational_priority: "urgent",
          primary_source: "ocr_local",
          next_action: "Revisar OCR local.",
          executed_actions: 1,
          document_actions: 0,
          automation_errors: 1,
          human_review_required: 0,
          recommendation: "Revisar error.",
        },
      ]);
    },
  };

  const history = await loadAutomationRunHistory(supabase as never, {
    now: new Date("2026-08-01T18:00:00.000Z"),
  });

  assert.equal(history.total, 3);
  assert.equal(history.freshnessStatus, "fresh");
  assert.equal(history.latestRunAgeHours, 6);
  assert.match(history.freshnessSummary, /vigente/);
  assert.equal(history.clean, 1);
  assert.equal(history.attentionRequired, 1);
  assert.equal(history.errors, 1);
  assert.equal(history.normalPriority, 1);
  assert.equal(history.attentionPriority, 1);
  assert.equal(history.urgentPriority, 1);
  assert.equal(history.totalExecutedActions, 12);
  assert.equal(history.totalDocumentActions, 6);
  assert.equal(history.totalHumanReviewRequired, 2);
  assert.equal(history.totalAutomationErrors, 1);
  assert.equal(history.latestRun?.id, "run-1");
  assert.equal(history.latestRun?.triggerSource, "cron");
  assert.equal(history.latestRun?.operationalPriority, "attention");
  assert.equal(history.latestRun?.primarySource, "eventos_documentales_humanos");
  assert.equal(history.latestRun?.nextAction, "Atender cola documental.");
  assert.match(history.summary, /2 revision/);
});

test("marks automation history as stale when the latest run is old", async () => {
  const supabase = {
    from() {
      return queryResult([
        {
          id: "run-old",
          ran_at: "2026-07-30T12:00:00.000Z",
          trigger_source: "cron",
          status: "clean",
          operational_priority: "normal",
          primary_source: null,
          next_action: "Mantener monitoreo normal.",
          executed_actions: 1,
          document_actions: 0,
          automation_errors: 0,
          human_review_required: 0,
          recommendation: "Corrida limpia.",
        },
      ]);
    },
  };

  const history = await loadAutomationRunHistory(supabase as never, {
    now: new Date("2026-08-01T18:00:00.000Z"),
    staleAfterHours: 26,
  });

  assert.equal(history.freshnessStatus, "stale");
  assert.equal(history.latestRunAgeHours, 54);
  assert.match(history.recommendedAction, /ticker manual/);
});

test("returns controlled error when automation run table is unavailable", async () => {
  const supabase = {
    from() {
      return queryResult(null, { message: "relation does not exist" });
    },
  };

  const history = await loadAutomationRunHistory(supabase as never);

  assert.equal(history.total, 0);
  assert.equal(history.freshnessStatus, "missing");
  assert.match(history.error ?? "", /relation does not exist/);
});

test("falls back to legacy automation history when priority columns are missing", async () => {
  let calls = 0;
  const supabase = {
    from() {
      calls += 1;
      if (calls === 1) {
        return queryResult(null, { message: "column operational_priority does not exist" });
      }

      return queryResult([
        {
          id: "run-legacy",
          ran_at: "2026-08-01T12:00:00.000Z",
          trigger_source: "cron",
          status: "attention_required",
          executed_actions: 1,
          document_actions: 0,
          automation_errors: 0,
          human_review_required: 1,
          recommendation: "Atender revision.",
        },
      ]);
    },
  };

  const history = await loadAutomationRunHistory(supabase as never, {
    now: new Date("2026-08-01T13:00:00.000Z"),
  });

  assert.equal(history.total, 1);
  assert.equal(history.latestRun?.operationalPriority, "attention");
  assert.equal(history.latestRun?.nextAction, "Atender revision.");
  assert.equal(history.error, null);
});
