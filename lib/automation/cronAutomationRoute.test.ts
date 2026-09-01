import assert from "node:assert/strict";
import test from "node:test";

import { assertCronAuthorized } from "@/lib/automation/cronAuth";
import { handleCronAutomation } from "@/lib/automation/cronAutomationRoute";
import type { AutomationCycleResult } from "@/lib/automation/runAutomationCycle";

const result: AutomationCycleResult = {
  ranAt: "2026-09-01T00:00:00.000Z",
  openaiConfigured: true,
  identity: { processed: 0, approved: 0, rejected: 0, dudoso: 0 },
  workers: { processed: 0, approved: 0, rejected: 0, dudosos: 0 },
  matching: { processed: 0, invited: 0 },
  payments: { checked: 0, confirmed: 0 },
  localOcr: { attempted: 0, completed: 0, manualReview: 0, failed: 0, skipped: 0, items: [], error: null, summary: "" },
  documentReminders: { checked: 0, prepared: 0, skipped: 0, eventIds: [], error: null, summary: "" },
  documentSuspensions: { checked: 0, prepared: 0, skipped: 0, eventIds: [], error: null, summary: "" },
  documentNotifications: { checked: 0, created: 0, skipped: 0, notificationIds: [], error: null, summary: "" },
  documentNotificationCleanup: { checkedProfiles: 0, closed: 0, failed: 0, items: [], error: null, summary: "" },
  documentEvents: { items: [], total: 0, critical: 0, high: 0, medium: 0, low: 0, humanActionRequired: 0, automaticFollowUps: 0, error: null, summary: "" },
  summary: {
    status: "clean",
    operationalPriority: "normal",
    primarySource: null,
    nextAction: "Mantener automatizacion activa y monitoreo normal.",
    executedActions: 0,
    documentActions: 0,
    automationErrors: 0,
    errorSources: [],
    humanReviewRequired: 0,
    humanReviewSources: [],
    recommendation: "Ciclo automatico limpio: no habia acciones pendientes.",
  },
};

test("cron authorization rejects missing and incorrect secrets", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "secret-test";
  try {
    assert.equal(assertCronAuthorized(new Request("https://zovit.test/api/cron/automate")), false);
    assert.equal(assertCronAuthorized(new Request("https://zovit.test/api/cron/automate?secret=incorrecto")), false);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("cron authorization accepts the configured secret without exposing it", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "secret-test";
  try {
    assert.equal(assertCronAuthorized(new Request("https://zovit.test/api/cron/automate", {
      headers: { authorization: "Bearer secret-test" },
    })), true);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("cron route rejects an unauthorized request before running the cycle", async () => {
  let runs = 0;
  const response = await handleCronAutomation(new Request("https://zovit.test/api/cron/automate"), {
    authorize: () => false,
    runCycle: async () => { runs += 1; return result; },
    persistRun: async () => ({ runId: null, error: null }),
  });
  assert.equal(response.status, 401);
  assert.equal(runs, 0);
});

test("cron route runs the cycle exactly once and persists its cron result", async () => {
  let runs = 0;
  let persisted = 0;
  const response = await handleCronAutomation(new Request("https://zovit.test/api/cron/automate"), {
    authorize: () => true,
    runCycle: async () => { runs += 1; return result; },
    persistRun: async (input) => {
      persisted += 1;
      assert.equal(input.triggerSource, "cron");
      assert.equal(input.result, result);
      return { runId: "run-1", error: null };
    },
  });
  assert.equal(response.status, 200);
  assert.equal(runs, 1);
  assert.equal(persisted, 1);
  assert.equal((await response.json() as { ok: boolean }).ok, true);
});

test("cron route returns a controlled error when the cycle fails", async () => {
  const response = await handleCronAutomation(new Request("https://zovit.test/api/cron/automate"), {
    authorize: () => true,
    runCycle: async () => { throw new Error("internal detail"); },
    persistRun: async () => ({ runId: null, error: null }),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo ejecutar la automatización." });
});
