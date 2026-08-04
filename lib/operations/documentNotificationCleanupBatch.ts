import type { SupabaseClient } from "@supabase/supabase-js";

import { loadDocumentComplianceDashboard } from "@/lib/operations/documentComplianceDashboard";
import {
  closeResolvedDocumentNotifications,
  type DocumentNotificationCleanupResult,
} from "@/lib/operations/documentNotificationCleanup";

export type DocumentNotificationCleanupBatchResult = {
  checkedProfiles: number;
  closed: number;
  failed: number;
  items: Array<DocumentNotificationCleanupResult & { profileId: string }>;
  error: string | null;
  summary: string;
};

export async function closeResolvedDocumentNotificationsBatch(input: {
  supabase: SupabaseClient;
  limit?: number;
}): Promise<DocumentNotificationCleanupBatchResult> {
  const dashboard = await loadDocumentComplianceDashboard(input.supabase, {
    limit: input.limit ?? 50,
  });

  if (dashboard.error) {
    return buildResult({
      checkedProfiles: 0,
      closed: 0,
      failed: 0,
      items: [],
      error: dashboard.error,
    });
  }

  const candidates = dashboard.profiles.filter((profile) =>
    ["complete", "pending_review"].includes(profile.compliance.status),
  );
  const items: Array<DocumentNotificationCleanupResult & { profileId: string }> = [];

  for (const profile of candidates) {
    const result = await closeResolvedDocumentNotifications({
      supabase: input.supabase,
      profileId: profile.profileId,
      status: profile.compliance.status,
      semesterYear: profile.compliance.period.year,
      semester: profile.compliance.period.code,
    });
    items.push({ ...result, profileId: profile.profileId });
  }

  return buildResult({
    checkedProfiles: candidates.length,
    closed: items.reduce((sum, item) => sum + item.closed, 0),
    failed: items.filter((item) => item.error).length,
    items,
    error: null,
  });
}

function buildResult(
  input: Omit<DocumentNotificationCleanupBatchResult, "summary">,
): DocumentNotificationCleanupBatchResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(input: Omit<DocumentNotificationCleanupBatchResult, "summary">): string {
  if (input.error) return `No se pudo limpiar avisos documentales: ${input.error}`;
  if (input.closed > 0) return `${input.closed} avisos documentales fueron cerrados.`;
  return "No hay avisos documentales resueltos por cerrar.";
}
