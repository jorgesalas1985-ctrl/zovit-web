import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { closeResolvedDocumentNotifications } from "@/lib/operations/documentNotificationCleanup";
import { loadOwnDocumentCompliance } from "@/lib/operations/ownDocumentCompliance";
import { resolveRequiredDocumentKinds } from "@/lib/worker/requiredDocuments";
import type { ServiceProfileType } from "@/lib/worker/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    let accountKind: string | null = null;
    let primaryProfile: ServiceProfileType | null = null;
    const { data: profileExtra, error: profileExtraError } = await auth.supabase
      .from("profiles")
      .select("account_kind, primary_service_profile")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profileExtraError && profileExtra) {
      accountKind = (profileExtra.account_kind as string | null) ?? null;
      primaryProfile = (profileExtra.primary_service_profile as ServiceProfileType | null) ?? null;
    }

    const requiredKinds = resolveRequiredDocumentKinds({
      accountKind,
      primaryProfile,
    });

    const result = await loadOwnDocumentCompliance({
      supabase: auth.supabase,
      profileId: auth.user.id,
      requiredKinds,
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
