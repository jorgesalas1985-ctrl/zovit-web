import assert from "node:assert/strict";
import test from "node:test";

import { buildAutomationCycleSummary } from "@/lib/automation/runAutomationCycle";

const baseResult = {
  ranAt: "2026-08-01T12:00:00.000Z",
  openaiConfigured: false,
  identity: { processed: 0, approved: 0, rejected: 0, dudoso: 0 },
  workers: { processed: 0, approved: 0, rejected: 0, dudosos: 0 },
  matching: { processed: 0, invited: 0 },
  payments: { checked: 0, confirmed: 0 },
  localOcr: {
    attempted: 0,
    completed: 0,
    manualReview: 0,
    failed: 0,
    skipped: 0,
    items: [],
    error: null,
    summary: "Sin OCR.",
  },
  documentReminders: {
    checked: 0,
    prepared: 0,
    skipped: 0,
    eventIds: [],
    error: null,
    summary: "Sin recordatorios.",
  },
  documentSuspensions: {
    checked: 0,
    prepared: 0,
    skipped: 0,
    eventIds: [],
    error: null,
    summary: "Sin suspensiones.",
  },
  documentNotifications: {
    checked: 0,
    created: 0,
    skipped: 0,
    notificationIds: [],
    error: null,
    summary: "Sin notificaciones.",
  },
  documentNotificationCleanup: {
    checkedProfiles: 0,
    closed: 0,
    failed: 0,
    items: [],
    error: null,
    summary: "Sin limpieza.",
  },
  documentEvents: {
    items: [],
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    humanActionRequired: 0,
    automaticFollowUps: 0,
    error: null,
    summary: "Sin eventos.",
  },
};

test("summarizes a clean automation cycle with executed actions", () => {
  const summary = buildAutomationCycleSummary({
    ...baseResult,
    documentReminders: {
      ...baseResult.documentReminders,
      prepared: 2,
    },
    documentNotifications: {
      ...baseResult.documentNotifications,
      created: 2,
    },
  });

  assert.equal(summary.status, "clean");
  assert.equal(summary.operationalPriority, "attention");
  assert.equal(summary.primarySource, "recordatorios_documentales");
  assert.match(summary.nextAction, /renovaciones documentales/);
  assert.equal(summary.executedActions, 4);
  assert.equal(summary.documentActions, 4);
  assert.equal(summary.automationErrors, 0);
  assert.deepEqual(summary.errorSources, []);
  assert.deepEqual(summary.humanReviewSources, []);
});

test("prioritizes human review when the cycle generated manual work", () => {
  const summary = buildAutomationCycleSummary({
    ...baseResult,
    localOcr: {
      ...baseResult.localOcr,
      manualReview: 1,
    },
    documentEvents: {
      ...baseResult.documentEvents,
      critical: 1,
      high: 1,
      humanActionRequired: 2,
    },
  });

  assert.equal(summary.status, "attention_required");
  assert.equal(summary.operationalPriority, "attention");
  assert.equal(summary.primarySource, "ocr_revision_manual");
  assert.match(summary.nextAction, /ocr_revision_manual/);
  assert.equal(summary.humanReviewRequired, 3);
  assert.deepEqual(summary.humanReviewSources, [
    "ocr_revision_manual",
    "eventos_documentales_humanos",
  ]);
});

test("prioritizes automation errors over regular attention", () => {
  const summary = buildAutomationCycleSummary({
    ...baseResult,
    localOcr: {
      ...baseResult.localOcr,
      manualReview: 1,
      error: "operational_documents no existe",
    },
  });

  assert.equal(summary.status, "error");
  assert.equal(summary.operationalPriority, "urgent");
  assert.equal(summary.primarySource, "ocr_local");
  assert.match(summary.nextAction, /ocr_local/);
  assert.equal(summary.automationErrors, 1);
  assert.deepEqual(summary.errorSources, ["ocr_local"]);
});

test("marks document suspension risk as urgent even without technical errors", () => {
  const summary = buildAutomationCycleSummary({
    ...baseResult,
    documentSuspensions: {
      ...baseResult.documentSuspensions,
      prepared: 1,
    },
    documentEvents: {
      ...baseResult.documentEvents,
      critical: 1,
    },
  });

  assert.equal(summary.status, "clean");
  assert.equal(summary.operationalPriority, "urgent");
  assert.equal(summary.primarySource, "riesgo_documental");
  assert.match(summary.nextAction, /suspension documental/);
});
