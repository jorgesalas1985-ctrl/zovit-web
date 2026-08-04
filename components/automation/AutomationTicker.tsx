"use client";

import { useEffect, useRef } from "react";
import {
  AUTOMATION_SUMMARY_STORAGE_KEY,
  AUTOMATION_TICK_STORAGE_KEY,
  type StoredAutomationSummary,
} from "@/components/automation/automationStorage";

const COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Al abrir paneles admin, dispara un ciclo corto de automatización
 * (colas IA, matching, pagos) sin intervención manual.
 */
export function AutomationTicker() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    try {
      const last = Number(sessionStorage.getItem(AUTOMATION_TICK_STORAGE_KEY) || "0");
      if (Date.now() - last < COOLDOWN_MS) return;
      sessionStorage.setItem(AUTOMATION_TICK_STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }

    void fetch("/api/automation/tick", { method: "POST" })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as {
          summary?: StoredAutomationSummary;
        } | null;
        if (!response.ok || !data?.summary) return;

        try {
          sessionStorage.setItem(
            AUTOMATION_SUMMARY_STORAGE_KEY,
            JSON.stringify({
              ranAt: new Date().toISOString(),
              ...sanitizeSummary(data.summary),
            }),
          );
        } catch {
          // ignore
        }
      })
      .catch(() => undefined);
  }, []);

  return null;
}

function sanitizeSummary(summary: StoredAutomationSummary) {
  return {
    status: typeof summary.status === "string" ? summary.status : "unknown",
    operationalPriority:
      typeof summary.operationalPriority === "string" ? summary.operationalPriority : "normal",
    primarySource:
      typeof summary.primarySource === "string" ? summary.primarySource.slice(0, 80) : null,
    nextAction: typeof summary.nextAction === "string" ? summary.nextAction.slice(0, 300) : "",
    executedActions: normalizeNumber(summary.executedActions),
    documentActions: normalizeNumber(summary.documentActions),
    automationErrors: normalizeNumber(summary.automationErrors),
    errorSources: normalizeStringList(summary.errorSources),
    humanReviewRequired: normalizeNumber(summary.humanReviewRequired),
    humanReviewSources: normalizeStringList(summary.humanReviewSources),
    recommendation:
      typeof summary.recommendation === "string" ? summary.recommendation.slice(0, 300) : "",
  };
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 80))
    .slice(0, 10);
}
