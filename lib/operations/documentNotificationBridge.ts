import type { SupabaseClient } from "@supabase/supabase-js";

import type { OperationalDocumentEventType } from "@/lib/operations/documentRenewalPersistence";

export type DocumentNotificationBridgeResult = {
  checked: number;
  created: number;
  skipped: number;
  notificationIds: string[];
  error: string | null;
  summary: string;
};

type DocumentNotificationEventType =
  | "semester_renewal_reminder"
  | "semester_suspension_ready";

export async function createDocumentEventNotifications(input: {
  supabase: SupabaseClient;
  limit?: number;
  eventType?: DocumentNotificationEventType;
}): Promise<DocumentNotificationBridgeResult> {
  const limit = normalizeLimit(input.limit);
  const eventTypes: DocumentNotificationEventType[] = input.eventType
    ? [input.eventType]
    : ["semester_renewal_reminder", "semester_suspension_ready"];
  const { data, error } = await input.supabase
    .from("operational_document_events")
    .select("id,profile_id,event_type,summary,semester_year,semester,metadata,created_at")
    .in("event_type", eventTypes)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return buildResult({
      checked: 0,
      created: 0,
      skipped: 0,
      notificationIds: [],
      error: error.message,
    });
  }

  const events = ((data ?? []) as DocumentNotificationEventRow[]).filter(
    (event) =>
      event.event_type === "semester_renewal_reminder" ||
      event.event_type === "semester_suspension_ready",
  );
  const notifications = events.map(buildNotificationInsert);
  let created = 0;
  let skipped = 0;
  const notificationIds: string[] = [];

  for (const notification of notifications) {
    const exists = await notificationExists(input.supabase, notification);
    if (exists.error) {
      return buildResult({
        checked: events.length,
        created,
        skipped,
        notificationIds,
        error: exists.error,
      });
    }

    if (exists.exists) {
      skipped += 1;
      continue;
    }

    const { data: inserted, error: insertError } = await input.supabase
      .from("notifications")
      .insert(toNotificationInsertPayload(notification))
      .select("id")
      .maybeSingle();

    if (insertError) {
      return buildResult({
        checked: events.length,
        created,
        skipped,
        notificationIds,
        error: insertError.message,
      });
    }

    created += 1;
    const id = (inserted as { id?: string } | null)?.id;
    if (id) notificationIds.push(id);
  }

  return buildResult({
    checked: events.length,
    created,
    skipped,
    notificationIds,
    error: null,
  });
}

type DocumentNotificationEventRow = {
  id: string;
  profile_id: string;
  event_type: OperationalDocumentEventType;
  summary: string;
  semester_year: number;
  semester: "S1" | "S2";
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type NotificationInsert = {
  user_id: string;
  request_id: null;
  title: string;
  body: string;
  semesterYear: number;
  semester: "S1" | "S2";
};

type NotificationInsertPayload = Omit<NotificationInsert, "semesterYear" | "semester">;

function buildNotificationInsert(event: DocumentNotificationEventRow): NotificationInsert {
  const deadlineAt =
    typeof event.metadata?.deadlineAt === "string" ? event.metadata.deadlineAt : null;
  const missingKinds = Array.isArray(event.metadata?.missingKinds)
    ? event.metadata.missingKinds.join(", ")
    : "";

  if (event.event_type === "semester_suspension_ready") {
    return {
      user_id: event.profile_id,
      request_id: null,
      title: "Cuenta pendiente por documentos",
      body: [
        `Tu documentacion del semestre ${event.semester_year}-${event.semester} esta vencida.`,
        missingKinds ? `Faltan: ${missingKinds}.` : "",
        "Toca esta notificacion para regularizarla en ZOVIT.",
      ]
        .filter(Boolean)
        .join(" "),
      semesterYear: event.semester_year,
      semester: event.semester,
    };
  }

  return {
    user_id: event.profile_id,
    request_id: null,
    title: "Renueva tus documentos ZOVIT",
    body: [
      `Tu plazo documental del semestre ${event.semester_year}-${event.semester} esta por vencer.`,
      deadlineAt ? `Fecha limite: ${deadlineAt}.` : "",
      missingKinds ? `Faltan: ${missingKinds}.` : "",
      "Toca esta notificacion para renovar.",
    ]
      .filter(Boolean)
      .join(" "),
    semesterYear: event.semester_year,
    semester: event.semester,
  };
}

async function notificationExists(
  supabase: SupabaseClient,
  notification: NotificationInsert,
): Promise<{ exists: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", notification.user_id)
    .eq("title", notification.title)
    .ilike("body", `%semestre ${notification.semesterYear}-${notification.semester}%`)
    .limit(1);

  if (error) return { exists: false, error: error.message };
  return { exists: (data ?? []).length > 0, error: null };
}

function toNotificationInsertPayload(notification: NotificationInsert): NotificationInsertPayload {
  return {
    user_id: notification.user_id,
    request_id: notification.request_id,
    title: notification.title,
    body: notification.body,
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return 50;
  return Math.min(Math.floor(limit), 200);
}

function buildResult(
  input: Omit<DocumentNotificationBridgeResult, "summary">,
): DocumentNotificationBridgeResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(input: Omit<DocumentNotificationBridgeResult, "summary">): string {
  if (input.error) return `No se pudieron crear notificaciones documentales: ${input.error}`;
  if (input.created > 0) return `${input.created} notificaciones documentales creadas.`;
  if (input.skipped > 0) return `${input.skipped} notificaciones documentales ya existian.`;
  return "No hay eventos documentales notificables.";
}
