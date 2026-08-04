import type { SupabaseClient } from "@supabase/supabase-js";

import type { DocumentSemesterComplianceStatus } from "@/lib/operations/documentSemesterCompliance";

export type DocumentNotificationCleanupResult = {
  checked: number;
  closed: number;
  error: string | null;
  summary: string;
};

const DOCUMENT_NOTIFICATION_TITLES = [
  "Renueva tus documentos ZOVIT",
  "Cuenta pendiente por documentos",
];

export function shouldCloseDocumentNotifications(status: DocumentSemesterComplianceStatus): boolean {
  return status === "complete" || status === "pending_review";
}

export async function closeResolvedDocumentNotifications(input: {
  supabase: SupabaseClient;
  profileId: string;
  status: DocumentSemesterComplianceStatus;
  semesterYear?: number;
  semester?: "S1" | "S2";
  now?: Date;
}): Promise<DocumentNotificationCleanupResult> {
  if (!shouldCloseDocumentNotifications(input.status)) {
    return buildResult({
      checked: 0,
      closed: 0,
      error: null,
    });
  }

  let query = input.supabase
    .from("notifications")
    .select("id")
    .eq("user_id", input.profileId)
    .is("read_at", null)
    .in("title", DOCUMENT_NOTIFICATION_TITLES);

  if (input.semesterYear && input.semester) {
    query = query.ilike("body", `%semestre ${input.semesterYear}-${input.semester}%`);
  }

  const { data: unread, error: loadError } = await query;

  if (loadError) {
    return buildResult({
      checked: 0,
      closed: 0,
      error: loadError.message,
    });
  }

  const ids = ((unread ?? []) as { id?: string }[])
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));

  if (!ids.length) {
    return buildResult({
      checked: 0,
      closed: 0,
      error: null,
    });
  }

  const { error: updateError } = await input.supabase
    .from("notifications")
    .update({ read_at: (input.now ?? new Date()).toISOString() })
    .in("id", ids);

  if (updateError) {
    return buildResult({
      checked: ids.length,
      closed: 0,
      error: updateError.message,
    });
  }

  return buildResult({
    checked: ids.length,
    closed: ids.length,
    error: null,
  });
}

function buildResult(
  input: Omit<DocumentNotificationCleanupResult, "summary">,
): DocumentNotificationCleanupResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(input: Omit<DocumentNotificationCleanupResult, "summary">): string {
  if (input.error) return `No se pudieron cerrar avisos documentales: ${input.error}`;
  if (input.closed > 0) return `${input.closed} avisos documentales quedaron cerrados.`;
  return "No hay avisos documentales por cerrar.";
}
