import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { closeResolvedDocumentNotifications } from "@/lib/operations/documentNotificationCleanup";
import { loadOwnDocumentCompliance } from "@/lib/operations/ownDocumentCompliance";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const result = await loadOwnDocumentCompliance({
      supabase: auth.supabase,
      profileId: auth.user.id,
    });
    const cleanup = result.error
      ? null
      : await closeResolvedDocumentNotifications({
          supabase: auth.supabase,
          profileId: auth.user.id,
          status: result.compliance.status,
          semesterYear: result.compliance.period.year,
          semester: result.compliance.period.code,
        });

    return NextResponse.json(
      {
        ...result,
        cleanup,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
