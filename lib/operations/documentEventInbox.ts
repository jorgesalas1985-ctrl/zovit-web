import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OperationalDocumentActorType,
  OperationalDocumentEventType,
} from "@/lib/operations/documentRenewalPersistence";

export type DocumentEventPriority = "critical" | "high" | "medium" | "low";

export type DocumentEventInboxItem = {
  eventId: string;
  documentId: string | null;
  profileId: string;
  displayName: string;
  eventType: OperationalDocumentEventType;
  actorType: OperationalDocumentActorType;
  summary: string;
  semesterYear: number;
  semester: "S1" | "S2";
  createdAt: string;
  priority: DocumentEventPriority;
  requiresHumanAction: boolean;
  actionLabel: string;
  metadata: Record<string, unknown>;
};

export type DocumentEventInbox = {
  items: DocumentEventInboxItem[];
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  humanActionRequired: number;
  automaticFollowUps: number;
  error: string | null;
  summary: string;
};

export async function loadDocumentEventInbox(
  supabase: SupabaseClient,
  input?: {
    limit?: number;
    eventType?: OperationalDocumentEventType;
  },
): Promise<DocumentEventInbox> {
  const limit = normalizeLimit(input?.limit);
  let query = supabase
    .from("operational_document_events")
    .select(
      "id,document_id,profile_id,event_type,actor_type,summary,semester_year,semester,metadata,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input?.eventType) {
    query = query.eq("event_type", input.eventType);
  }

  const { data, error } = await query;
  if (error) return emptyInbox(error.message);

  const rows = (data ?? []) as OperationalDocumentEventRow[];
  const profileNames = await loadProfileNames(
    supabase,
    [...new Set(rows.map((row) => row.profile_id))],
  );

  if (profileNames.error) return emptyInbox(profileNames.error);

  const items = rows.map((row) => mapEventRow(row, profileNames.names));

  return {
    items,
    total: items.length,
    critical: items.filter((item) => item.priority === "critical").length,
    high: items.filter((item) => item.priority === "high").length,
    medium: items.filter((item) => item.priority === "medium").length,
    low: items.filter((item) => item.priority === "low").length,
    humanActionRequired: items.filter((item) => item.requiresHumanAction).length,
    automaticFollowUps: items.filter((item) => !item.requiresHumanAction).length,
    error: null,
    summary: buildSummary(items),
  };
}

type OperationalDocumentEventRow = {
  id: string;
  document_id: string | null;
  profile_id: string;
  event_type: OperationalDocumentEventType;
  actor_type: OperationalDocumentActorType;
  summary: string;
  semester_year: number;
  semester: "S1" | "S2";
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ProfileNameRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

async function loadProfileNames(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<{ names: Map<string, string>; error: string | null }> {
  if (!profileIds.length) return { names: new Map(), error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,last_name")
    .in("id", profileIds);

  if (error) return { names: new Map(), error: error.message };

  const names = new Map<string, string>();
  for (const row of (data ?? []) as ProfileNameRow[]) {
    names.set(row.id, [row.first_name, row.last_name].filter(Boolean).join(" ").trim());
  }

  return { names, error: null };
}

function mapEventRow(
  row: OperationalDocumentEventRow,
  profileNames: Map<string, string>,
): DocumentEventInboxItem {
  return {
    eventId: row.id,
    documentId: row.document_id,
    profileId: row.profile_id,
    displayName: profileNames.get(row.profile_id) || "Perfil sin nombre",
    eventType: row.event_type,
    actorType: row.actor_type,
    summary: row.summary,
    semesterYear: row.semester_year,
    semester: row.semester,
    createdAt: row.created_at,
    priority: priorityForEvent(row.event_type),
    requiresHumanAction: requiresHumanAction(row.event_type),
    actionLabel: actionLabelForEvent(row.event_type),
    metadata: row.metadata ?? {},
  };
}

function priorityForEvent(eventType: OperationalDocumentEventType): DocumentEventPriority {
  if (eventType === "semester_suspension_ready") return "critical";
  if (
    eventType === "manual_review_requested" ||
    eventType === "rejected" ||
    eventType === "post_decision_sync_failed"
  ) {
    return "high";
  }
  if (
    eventType === "expired" ||
    eventType === "ocr_completed" ||
    eventType === "semester_renewal_reminder"
  ) {
    return "medium";
  }
  return "low";
}

function requiresHumanAction(eventType: OperationalDocumentEventType): boolean {
  return [
    "manual_review_requested",
    "ocr_completed",
    "rejected",
    "expired",
    "semester_suspension_ready",
    "post_decision_sync_failed",
  ].includes(eventType);
}

function actionLabelForEvent(eventType: OperationalDocumentEventType): string {
  if (eventType === "semester_suspension_ready") {
    return "Revisar incumplimiento y decidir suspension documental.";
  }

  if (eventType === "manual_review_requested") {
    return "Revisar documento manualmente.";
  }

  if (eventType === "ocr_completed") {
    return "Validar datos OCR y aprobar o rechazar.";
  }

  if (eventType === "rejected") {
    return "Esperar reemplazo o contactar al usuario.";
  }

  if (eventType === "expired") {
    return "Solicitar renovacion documental.";
  }

  if (eventType === "post_decision_sync_failed") {
    return "Revisar sincronizacion documental posterior a la decision.";
  }

  if (eventType === "semester_renewal_reminder") {
    return "Seguimiento automatico de renovacion.";
  }

  return "Registrar seguimiento documental.";
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return 20;
  return Math.min(Math.floor(limit), 100);
}

function emptyInbox(error: string | null): DocumentEventInbox {
  return {
    items: [],
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    humanActionRequired: 0,
    automaticFollowUps: 0,
    error,
    summary: error ? `Eventos documentales pendientes: ${error}` : "Sin eventos documentales.",
  };
}

function buildSummary(items: DocumentEventInboxItem[]): string {
  const humanAction = items.filter((item) => item.requiresHumanAction).length;
  if (humanAction > 0) {
    return `${humanAction} eventos documentales requieren accion humana.`;
  }

  const critical = items.filter((item) => item.priority === "critical").length;
  if (critical > 0) return `${critical} eventos documentales criticos requieren seguimiento.`;

  const high = items.filter((item) => item.priority === "high").length;
  if (high > 0) return `${high} eventos documentales de alta prioridad requieren revision.`;

  return `${items.length} eventos documentales recientes.`;
}
