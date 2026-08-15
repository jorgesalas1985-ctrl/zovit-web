import { applySuperAdminTourProfile, readTourAccountFromCookie } from "@/lib/auth/applyTourProfile";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { closeResolvedDocumentNotifications } from "@/lib/operations/documentNotificationCleanup";
import { loadOwnDocumentCompliance } from "@/lib/operations/ownDocumentCompliance";
import { resolveRequiredDocumentKinds } from "@/lib/worker/requiredDocuments";
import type { ServiceProfileType } from "@/lib/worker/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    let accountKind: string | null = null;
    let primaryProfile: ServiceProfileType | null = null;
    const { data: profileExtra, error: profileExtraError } = await auth.supabase
      .from("profiles")
      .select("account_kind, primary_service_profile, intranet_role, role, can_act_as_client, can_act_as_professional, active_mode")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profileExtraError && profileExtra) {
      const tour = readTourAccountFromCookie(request.headers.get("cookie"));
      const effective = applySuperAdminTourProfile(
        {
          role: (profileExtra.role as "client" | "professional" | "admin") ?? "client",
          account_kind: (profileExtra.account_kind as string | null) ?? null,
          can_act_as_client: Boolean(profileExtra.can_act_as_client),
          can_act_as_professional: Boolean(profileExtra.can_act_as_professional),
          active_mode: profileExtra.active_mode === "professional" ? "professional" : "client",
          intranet_role: (profileExtra.intranet_role as string | null) ?? null,
        },
        tour,
      );
      accountKind = effective?.account_kind ?? null;
      primaryProfile = (profileExtra.primary_service_profile as ServiceProfileType | null) ?? null;
      if (accountKind === "student") primaryProfile = "in_training";
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
