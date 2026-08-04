"use client";

import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AUTOMATION_SUMMARY_STORAGE_KEY,
  type StoredAutomationSummary,
} from "@/components/automation/automationStorage";

export function AutomationLastSummary() {
  const [summary, setSummary] = useState<StoredAutomationSummary | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(AUTOMATION_SUMMARY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredAutomationSummary;
      setSummary(sanitizeStoredSummary(parsed));
    } catch {
      setSummary(null);
    }
  }, []);

  if (!summary) return null;

  const status = normalizeStatus(summary.status);

  return (
    <div className="intranetGrid" aria-label="Ultima automatizacion local">
      <article className="intranetCard intranetCardStatic">
        {status === "error" ? (
          <ShieldAlert size={24} />
        ) : status === "attention_required" ? (
          <AlertTriangle size={24} />
        ) : (
          <CheckCircle2 size={24} />
        )}
        <h3>{statusLabel(status)}</h3>
        <p>{summary.recommendation || "Ultima automatizacion local registrada."}</p>
      </article>
      <article className="intranetCard intranetCardStatic">
        <CheckCircle2 size={24} />
        <h3>{summary.executedActions ?? 0}</h3>
        <p>Acciones ejecutadas en la ultima corrida</p>
      </article>
      <article className="intranetCard intranetCardStatic">
        <AlertTriangle size={24} />
        <h3>{summary.humanReviewRequired ?? 0}</h3>
        <p>{formatSources(summary.humanReviewSources, "Revision humana pendiente")}</p>
      </article>
      <article className="intranetCard intranetCardStatic">
        <ShieldAlert size={24} />
        <h3>{summary.automationErrors ?? 0}</h3>
        <p>{formatSources(summary.errorSources, "Errores de automatizacion")}</p>
      </article>
      <article className="intranetCard intranetCardStatic">
        <Clock3 size={24} />
        <h3>{formatTime(summary.ranAt)}</h3>
        <p>Resumen local guardado en este navegador</p>
      </article>
      <article className="intranetCard intranetCardStatic">
        {summary.operationalPriority === "urgent" ? (
          <ShieldAlert size={24} />
        ) : summary.operationalPriority === "attention" ? (
          <AlertTriangle size={24} />
        ) : (
          <CheckCircle2 size={24} />
        )}
        <h3>{priorityLabel(summary.operationalPriority)}</h3>
        <p>{summary.nextAction || "Mantener monitoreo normal."}</p>
        {summary.primarySource ? <p>Fuente: {summary.primarySource}</p> : null}
      </article>
    </div>
  );
}

function sanitizeStoredSummary(summary: StoredAutomationSummary): StoredAutomationSummary {
  return {
    ranAt: typeof summary.ranAt === "string" ? summary.ranAt : undefined,
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

function normalizeStatus(status: unknown): "clean" | "attention_required" | "error" | "unknown" {
  if (status === "clean" || status === "attention_required" || status === "error") return status;
  return "unknown";
}

function statusLabel(status: ReturnType<typeof normalizeStatus>): string {
  if (status === "clean") return "Automatizacion limpia";
  if (status === "attention_required") return "Requiere atencion";
  if (status === "error") return "Con errores";
  return "Estado no disponible";
}

function priorityLabel(priority: string | undefined): string {
  if (priority === "urgent") return "Prioridad urgente";
  if (priority === "attention") return "Prioridad atencion";
  return "Prioridad normal";
}

function formatSources(sources: string[] | undefined, fallback: string): string {
  if (!sources?.length) return fallback;
  return sources.join(", ");
}

function formatTime(value: string | undefined): string {
  if (!value) return "Sin hora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin hora";
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
