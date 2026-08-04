import { AutomationLastSummary } from "@/components/automation/AutomationLastSummary";
import { AutomationTicker } from "@/components/automation/AutomationTicker";
import { IntranetGuard } from "@/components/intranet/IntranetGuard";
import { IntranetShell } from "@/components/intranet/IntranetShell";
import { loadAutomationRunHistory } from "@/lib/automation/automationRunHistory";
import { loadDocumentComplianceDashboard } from "@/lib/operations/documentComplianceDashboard";
import { loadDocumentEventInbox } from "@/lib/operations/documentEventInbox";
import { loadCurrentSemesterClosePreview } from "@/lib/operations/loadCurrentSemesterClosePreview";
import { loadLocalOcrQueue } from "@/lib/operations/localOcrQueue";
import { loadOperationalHistory } from "@/lib/operations/operationalHistory";
import type { ReviewQueuePriority } from "@/lib/operations/reviewQueue";
import { createClient } from "@/lib/supabase/server";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  ListChecks,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

const priorityLabels: Record<ReviewQueuePriority, string> = {
  critical: "Criticos",
  high: "Altos",
  medium: "Medios",
  low: "Bajos",
};

const closeChecklistSeverityLabels = {
  neutral: "Informativo",
  warning: "Observacion",
  critical: "Critico",
} as const;

const closeActionPriorityLabels = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
} as const;

const documentComplianceStatusLabels = {
  complete: "Completo",
  open: "Pendiente",
  due_soon: "Por vencer",
  pending_review: "Revision",
  suspension_ready: "Suspension",
} as const;

const documentEventPriorityLabels = {
  critical: "Critico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
} as const;

const documentEventTypeLabels: Record<string, string> = {
  submitted: "Ingresado",
  replaced: "Reemplazado",
  ocr_requested: "OCR solicitado",
  ocr_completed: "OCR completado",
  manual_review_requested: "Revision manual",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
  semester_renewal_reminder: "Recordatorio",
  semester_suspension_ready: "Listo para suspension",
  post_decision_sync_failed: "Sincronizacion pendiente",
};

const closeActionOwnerLabels = {
  operations: "Operaciones",
  superadmin: "SUPERADMIN",
} as const;

export default async function ZovitControlCenterPage() {
  const supabase = await createClient();
  const [
    { error, preview },
    history,
    automationHistory,
    ocrQueue,
    documentCompliance,
    documentEvents,
  ] = await Promise.all([
    loadCurrentSemesterClosePreview(supabase),
    loadOperationalHistory(supabase, { limit: 3 }),
    loadAutomationRunHistory(supabase, { limit: 3 }),
    loadLocalOcrQueue(supabase, { limit: 5 }),
    loadDocumentComplianceDashboard(supabase, { limit: 50 }),
    loadDocumentEventInbox(supabase, { limit: 5 }),
  ]);
  const { snapshot } = preview;
  const {
    actionPlan,
    auditTrail,
    controlCenter,
    executionPolicy,
    executiveRecommendations,
    healthPulse,
  } = snapshot;
  const actionsByQueueItem = new Map(
    actionPlan.items.map((action) => [action.queueItemId, action]),
  );

  return (
    <IntranetGuard allowedRoles={["hr_admin", "super_admin"]}>
      <IntranetShell
        title="Centro de Control ZOVIT"
        description="Vista operacional para renovaciones, revisiones, suspensiones y automatizaciones sensibles."
        kicker="OPERACIONES"
        wide
        headerAction={
          <>
            <Link className="secondaryButton" href="/intranet/admin/documentos">
              Revision documental
            </Link>
            <Link className="secondaryButton" href="/intranet/admin">
              Administracion
            </Link>
          </>
        }
      >
        <AutomationTicker />
        <AutomationLastSummary />

        {error ? (
          <div className="notice">
            No se pudo cargar perfiles reales: {error}
          </div>
        ) : null}

        {history.error ? (
          <div className="notice">
            Historial operacional pendiente: {history.error}
          </div>
        ) : null}

        {automationHistory.error ? (
          <div className="notice">
            Historial de automatizacion pendiente: {automationHistory.error}
          </div>
        ) : null}

        {ocrQueue.error ? (
          <div className="notice">
            Cola OCR local pendiente: {ocrQueue.error}
          </div>
        ) : null}

        {documentCompliance.error ? (
          <div className="notice">
            Cumplimiento documental pendiente: {documentCompliance.error}
          </div>
        ) : null}

        {documentEvents.error ? (
          <div className="notice">
            Eventos documentales pendientes: {documentEvents.error}
          </div>
        ) : null}

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <CalendarCheck size={24} />
            <h3>{history.snapshotCount}</h3>
            <p>Snapshots archivados recientes</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{history.closeCount}</h3>
            <p>Cierres semestrales recientes</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{history.latestSnapshot?.healthScore ?? "Sin historial"}</h3>
            <p>Ultimo pulso archivado</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{history.latestClose?.status ?? "Sin cierre"}</h3>
            <p>
              {history.latestClose
                ? `Ultimo cierre ${history.latestClose.year}-${history.latestClose.semester}`
                : "Sin cierre persistido"}
            </p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{automationHistory.total}</h3>
            <p>Corridas automaticas archivadas</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{automationHistory.latestRun?.status ?? "Sin historial"}</h3>
            <p>Ultima corrida persistida</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            {automationHistory.latestRun?.operationalPriority === "urgent" ? (
              <ShieldAlert size={24} />
            ) : automationHistory.latestRun?.operationalPriority === "attention" ? (
              <AlertTriangle size={24} />
            ) : (
              <ClipboardCheck size={24} />
            )}
            <h3>{automationHistory.latestRun?.operationalPriority ?? "Sin prioridad"}</h3>
            <p>{automationHistory.latestRun?.nextAction ?? "Sin accion recomendada persistida"}</p>
            {automationHistory.latestRun?.primarySource ? (
              <p>Fuente: {automationHistory.latestRun.primarySource}</p>
            ) : null}
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{automationHistory.totalExecutedActions}</h3>
            <p>Acciones en corridas recientes</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{automationHistory.totalHumanReviewRequired}</h3>
            <p>Revisiones humanas recientes</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <AlertTriangle size={24} />
            <h3>{automationHistory.totalAutomationErrors}</h3>
            <p>{automationHistory.summary}</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Bell size={24} />
            <h3>
              {automationHistory.clean}/{automationHistory.attentionRequired}/
              {automationHistory.errors}
            </h3>
            <p>Limpias / atencion / errores</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>
              {automationHistory.normalPriority}/{automationHistory.attentionPriority}/
              {automationHistory.urgentPriority}
            </h3>
            <p>Prioridad normal / atencion / urgente</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            {automationHistory.freshnessStatus === "fresh" ? (
              <ClipboardCheck size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}
            <h3>{automationHistory.freshnessStatus}</h3>
            <p>{automationHistory.freshnessSummary}</p>
            <p>{automationHistory.recommendedAction}</p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{ocrQueue.total}</h3>
            <p>Documentos en cola OCR local</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{ocrQueue.critical}</h3>
            <p>OCR critico / revision manual</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <AlertTriangle size={24} />
            <h3>{ocrQueue.high}</h3>
            <p>OCR alta prioridad</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Bell size={24} />
            <h3>{ocrQueue.medium}</h3>
            <p>OCR prioridad media</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{ocrQueue.humanActionRequired}</h3>
            <p>OCR con accion humana</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{ocrQueue.automaticCandidates}</h3>
            <p>Candidatos a OCR automatico</p>
          </article>
          <Link href="/intranet/admin/documentos" className="intranetCard">
            <ClipboardCheck size={24} />
            <h3>Resolver documentos</h3>
            <p>Abrir cola OCR, revisar datos extraidos y aprobar o rechazar documentos.</p>
          </Link>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{documentCompliance.totalProfiles}</h3>
            <p>
              Cumplimiento documental {documentCompliance.period.year}-
              {documentCompliance.period.code}
            </p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{documentCompliance.complete}</h3>
            <p>Perfiles con documentos completos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Bell size={24} />
            <h3>{documentCompliance.dueSoon}</h3>
            <p>Perfiles con plazo por vencer</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <AlertTriangle size={24} />
            <h3>{documentCompliance.pendingReview}</h3>
            <p>Perfiles en revision documental</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{documentCompliance.suspensionReady}</h3>
            <p>Listos para suspension documental</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>Documentos</h3>
            <p>{documentCompliance.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          {documentCompliance.topProfiles.slice(0, 5).map((profile) => (
            <article className="intranetCard intranetCardStatic" key={profile.profileId}>
              {profile.compliance.shouldSuspend ? (
                <ShieldAlert size={24} />
              ) : (
                <ClipboardCheck size={24} />
              )}
              <h3>{profile.displayName}</h3>
              <p>{documentComplianceStatusLabels[profile.compliance.status]}</p>
              <p>{profile.compliance.summary}</p>
              {profile.compliance.missingKinds.length ? (
                <p>Faltan: {profile.compliance.missingKinds.join(", ")}</p>
              ) : null}
              {profile.compliance.pendingKinds.length ? (
                <p>Revision: {profile.compliance.pendingKinds.join(", ")}</p>
              ) : null}
              <p>Plazo: {profile.compliance.deadlineAt}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{documentEvents.total}</h3>
            <p>Eventos documentales recientes</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{documentEvents.critical}</h3>
            <p>Eventos documentales criticos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <AlertTriangle size={24} />
            <h3>{documentEvents.high}</h3>
            <p>Eventos documentales altos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{documentEvents.humanActionRequired}</h3>
            <p>Acciones humanas documentales</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Bell size={24} />
            <h3>{documentEvents.automaticFollowUps}</h3>
            <p>Seguimientos automaticos documentales</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>Eventos</h3>
            <p>{documentEvents.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          {documentEvents.items.slice(0, 5).map((item) => (
            <article className="intranetCard intranetCardStatic" key={item.eventId}>
              {item.priority === "critical" ? (
                <ShieldAlert size={24} />
              ) : (
                <ClipboardCheck size={24} />
              )}
              <h3>{item.displayName}</h3>
              <p>{item.summary}</p>
              <p>Evento: {documentEventTypeLabels[item.eventType] ?? item.eventType}</p>
              <p>Prioridad: {documentEventPriorityLabels[item.priority]}</p>
              <p>Accion: {item.actionLabel}</p>
              <p>Semestre: {item.semesterYear}-{item.semester}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          {ocrQueue.items.slice(0, 5).map((item) => (
            <article className="intranetCard intranetCardStatic" key={item.documentId}>
              <ClipboardCheck size={24} />
              <h3>{item.documentKind}</h3>
              <p>{item.reason}</p>
              <p>Accion: {item.actionLabel}</p>
              <p>Prioridad: {closeActionPriorityLabels[item.priority]}</p>
              <p>Semestre: {item.semesterYear}-{item.semester}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <CalendarCheck size={24} />
            <h3>{preview.report.statusLabel}</h3>
            <p>Cierre {preview.target.year}-{preview.target.semester}</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{preview.target.mode}</h3>
            <p>{preview.target.summary}</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{preview.decision.canClose ? "Puede cerrar" : "No cerrar"}</h3>
            <p>{preview.decision.summary}</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{preview.summary.latestHealthScore ?? "Sin datos"}</h3>
            <p>{preview.operationalRecommendation}</p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{preview.auditTrail.preparedCount}</h3>
            <p>Eventos de cierre preparados</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{preview.auditTrail.retainedCount}</h3>
            <p>Eventos de cierre retenidos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{preview.auditTrail.superadminCount}</h3>
            <p>Eventos cierre SUPERADMIN</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>Auditoria cierre</h3>
            <p>{preview.auditTrail.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          {preview.report.checklist.map((item) => (
            <article className="intranetCard intranetCardStatic" key={item.id}>
              {item.passed ? <ClipboardCheck size={24} /> : <XCircle size={24} />}
              <h3>{item.passed ? "Aprobado" : closeChecklistSeverityLabels[item.severity]}</h3>
              <p>{item.label}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          {preview.report.metrics.map((metric) => (
            <article className="intranetCard intranetCardStatic" key={metric.label}>
              <CalendarCheck size={24} />
              <h3>{metric.value}</h3>
              <p>{metric.label}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          {preview.report.sections.map((section) => (
            <article className="intranetCard intranetCardStatic" key={section.title}>
              <ListChecks size={24} />
              <h3>{section.title}</h3>
              {section.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{preview.actionSummary.total}</h3>
            <p>Acciones de cierre</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>
              {preview.actionSummary.highestPriority
                ? closeActionPriorityLabels[preview.actionSummary.highestPriority]
                : "Sin prioridad"}
            </h3>
            <p>Mayor prioridad de cierre</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{preview.actionSummary.byOwner.operations}</h3>
            <p>Responsable Operaciones</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{preview.actionSummary.byOwner.superadmin}</h3>
            <p>Responsable SUPERADMIN</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>Resumen</h3>
            <p>{preview.actionSummary.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <CalendarCheck size={24} />
            <h3>{preview.executionPolicy.preparationCount}</h3>
            <p>Preparacion de cierre</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{preview.executionPolicy.manualCount}</h3>
            <p>Trabajo humano</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{preview.executionPolicy.superadminCount}</h3>
            <p>Retenido SUPERADMIN</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>Politica cierre</h3>
            <p>{preview.executionPolicy.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          {preview.actionItems.map((item) => (
            <article className="intranetCard intranetCardStatic" key={item.id}>
              <AlertTriangle size={24} />
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <p>Prioridad: {closeActionPriorityLabels[item.priority]}</p>
              <p>Responsable: {closeActionOwnerLabels[item.owner]}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{healthPulse.status}</h3>
            <p>Estado del pulso</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{healthPulse.score}/100</h3>
            <p>Puntaje operacional</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>Pulso</h3>
            <p>{healthPulse.summary}</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Bell size={24} />
            <h3>{healthPulse.reasons.length}</h3>
            <p>Senales activas</p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{executiveRecommendations.recommendations.length}</h3>
            <p>Recomendaciones</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{executiveRecommendations.highestPriority ?? "Sin prioridad"}</h3>
            <p>Mayor prioridad ejecutiva</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>Decision</h3>
            <p>{executiveRecommendations.summary}</p>
          </article>
          {executiveRecommendations.recommendations.slice(0, 1).map((item) => (
            <article className="intranetCard intranetCardStatic" key={item.id}>
              <AlertTriangle size={24} />
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{controlCenter.totalProfiles}</h3>
            <p>Perfiles evaluados</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>{controlCenter.totalItems}</h3>
            <p>Pendientes operativos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{controlCenter.requiresHumanAction}</h3>
            <p>Acciones humanas</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{controlCenter.highestPriority ? priorityLabels[controlCenter.highestPriority] : "Sin alertas"}</h3>
            <p>Mayor prioridad activa</p>
          </article>
        </div>

        <div className="intranetGrid">
          {Object.entries(controlCenter.priorityMetrics).map(([priority, value]) => (
            <article className="intranetCard intranetCardStatic" key={priority}>
              <Bell size={24} />
              <h3>{value}</h3>
              <p>{priorityLabels[priority as ReviewQueuePriority]}</p>
            </article>
          ))}
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{actionPlan.automaticCount}</h3>
            <p>Acciones automaticas</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{actionPlan.manualCount}</h3>
            <p>Acciones manuales</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{actionPlan.superadminApprovalCount}</h3>
            <p>Aprobacion SUPERADMIN</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>Plan</h3>
            <p>{actionPlan.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{auditTrail.readyCount}</h3>
            <p>Eventos listos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{auditTrail.retainedCount}</h3>
            <p>Eventos retenidos</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{auditTrail.blockedCount}</h3>
            <p>Eventos bloqueados</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>Auditoria</h3>
            <p>{auditTrail.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          <article className="intranetCard intranetCardStatic">
            <ClipboardCheck size={24} />
            <h3>{executionPolicy.executableCount}</h3>
            <p>Ejecutables ahora</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <Users size={24} />
            <h3>{executionPolicy.manualCount}</h3>
            <p>Retenidas por revision</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ShieldAlert size={24} />
            <h3>{executionPolicy.superadminApprovalCount}</h3>
            <p>Esperan SUPERADMIN</p>
          </article>
          <article className="intranetCard intranetCardStatic">
            <ListChecks size={24} />
            <h3>Politica</h3>
            <p>{executionPolicy.summary}</p>
          </article>
        </div>

        <div className="intranetGrid">
          {controlCenter.topItems.map((item) => {
            const action = actionsByQueueItem.get(item.id);
            const policy = executionPolicy.items.find(
              (policyItem) => policyItem.queueItemId === item.id,
            );

            return (
              <article className="intranetCard intranetCardStatic" key={item.id}>
                <AlertTriangle size={24} />
                <h3>{item.title}</h3>
                <p>{item.displayName}</p>
                <p>{item.summary}</p>
                {action ? <p>Accion: {action.title}</p> : null}
                {policy ? <p>Estado: {policy.status}</p> : null}
                {item.dueAt ? <p>Plazo: {item.dueAt}</p> : null}
              </article>
            );
          })}
        </div>
      </IntranetShell>
    </IntranetGuard>
  );
}
