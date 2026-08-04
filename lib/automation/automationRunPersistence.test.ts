import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOperationalAutomationRunInsert,
  persistOperationalAutomationRun,
  persistOperationalAutomationRunBestEffort,
} from "@/lib/automation/automationRunPersistence";
import type { AutomationCycleResult } from "@/lib/automation/runAutomationCycle";

const automationResult: AutomationCycleResult = {
  ranAt: "2026-08-01T12:00:00.000Z",
  openaiConfigured: false,
  identity: { processed: 0, approved: 0, rejected: 0, dudoso: 0 },
  workers: { processed: 0, approved: 0, rejected: 0, dudosos: 0 },
  matching: { processed: 1, invited: 2 },
  payments: { checked: 0, confirmed: 0 },
  localOcr: {
    attempted: 1,
    completed: 0,
    manualReview: 1,
    failed: 0,
    skipped: 0,
    items: [],
    error: null,
    summary: "OCR local derivo 1 documento a revision.",
  },
  documentReminders: {
    checked: 10,
    prepared: 2,
    skipped: 0,
    eventIds: ["event-1", "event-2"],
    error: null,
    summary: "2 recordatorios preparados.",
  },
  documentSuspensions: {
    checked: 10,
    prepared: 0,
    skipped: 0,
    eventIds: [],
    error: null,
    summary: "Sin suspensiones.",
  },
  documentNotifications: {
    checked: 2,
    created: 2,
    skipped: 0,
    notificationIds: ["notification-1", "notification-2"],
    error: null,
    summary: "2 notificaciones creadas.",
  },
  documentNotificationCleanup: {
    checkedProfiles: 1,
    closed: 1,
    failed: 0,
    items: [],
    error: null,
    summary: "1 aviso cerrado.",
  },
  documentEvents: {
    items: [],
    total: 1,
    critical: 0,
    high: 0,
    medium: 1,
    low: 0,
    humanActionRequired: 1,
    automaticFollowUps: 0,
    error: null,
    summary: "1 evento requiere accion humana.",
  },
  summary: {
    status: "attention_required",
    operationalPriority: "attention",
    primarySource: "ocr_revision_manual",
    nextAction: "Atender cola de ocr_revision_manual.",
    executedActions: 9,
    documentActions: 6,
    automationErrors: 0,
    errorSources: [],
    humanReviewRequired: 2,
    humanReviewSources: ["ocr_revision_manual", "eventos_documentales_humanos"],
    recommendation: "Atender 2 elemento(s) con revision humana o prioridad documental.",
  },
};

test("builds operational automation run insert from cycle result", () => {
  const insert = buildOperationalAutomationRunInsert({
    result: automationResult,
    triggerSource: "cron",
    userId: "admin-1",
  });

  assert.equal(insert.run_key, "automation-run:cron:2026-08-01T12:00:00.000Z");
  assert.equal(insert.status, "attention_required");
  assert.equal(insert.operational_priority, "attention");
  assert.equal(insert.primary_source, "ocr_revision_manual");
  assert.equal(insert.next_action, "Atender cola de ocr_revision_manual.");
  assert.equal(insert.executed_actions, 9);
  assert.equal(insert.document_actions, 6);
  assert.equal(insert.human_review_required, 2);
  assert.deepEqual(insert.human_review_sources, [
    "ocr_revision_manual",
    "eventos_documentales_humanos",
  ]);
  assert.equal(insert.created_by, "admin-1");
});

test("persists operational automation run insert", async () => {
  const inserts: unknown[] = [];
  const supabase = {
    from(table: string) {
      assert.equal(table, "operational_automation_runs");
      return {
        insert(payload: unknown) {
          inserts.push(payload);
          return {
            select() {
              return {
                maybeSingle() {
                  return Promise.resolve({ data: { id: "run-1" }, error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await persistOperationalAutomationRun({
    supabase: supabase as never,
    result: automationResult,
    triggerSource: "manual",
  });

  assert.equal(result.runId, "run-1");
  assert.equal(result.error, null);
  assert.equal(inserts.length, 1);
  assert.equal((inserts[0] as Record<string, unknown>).trigger_source, "manual");
  assert.equal((inserts[0] as Record<string, unknown>).operational_priority, "attention");
});

test("best-effort persistence returns controlled error when client creation throws", async () => {
  const result = await persistOperationalAutomationRunBestEffort({
    createSupabase() {
      throw new Error("Supabase admin no configurado");
    },
    result: automationResult,
    triggerSource: "cron",
  });

  assert.equal(result.runId, null);
  assert.match(result.error ?? "", /Supabase admin/);
});
