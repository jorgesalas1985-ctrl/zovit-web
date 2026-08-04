import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { evaluateWorkerOperationalStatus } from "@/lib/operational/worker";

async function requireHrReviewer() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("intranet_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = isIntranetRole(profile?.intranet_role) ? profile.intranet_role : null;
  if (!role || !["hr_admin", "super_admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { supabase, user: authData.user };
}

export async function GET(request: Request) {
  try {
    const auth = await requireHrReviewer();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const profileType = searchParams.get("profile");

    const profileFields =
      "id,first_name,last_name,rut,commune,primary_service_profile,worker_registration_status,identity_status,identity_verified,biometric_verified";
    const selectWithAi =
      `profile_id,status,suggested_profiles,submitted_at,reviewed_at,review_message,updated_at,draft,ai_review_status,ai_confidence,ai_forgery_risk,ai_review_summary, profiles!inner(${profileFields})`;
    const selectBase =
      `profile_id,status,suggested_profiles,submitted_at,reviewed_at,review_message,updated_at,draft, profiles!inner(${profileFields})`;

    let query = auth.supabase
      .from("worker_registrations")
      .select(selectWithAi)
      .order("updated_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (profileType) query = query.contains("suggested_profiles", [profileType]);

    let data: unknown[] | null = null;
    const primary = await query.limit(100);
    let error = primary.error;
    data = primary.data as unknown[] | null;

    if (error && /ai_review_|schema cache|column/i.test(error.message)) {
      let fallback = auth.supabase
        .from("worker_registrations")
        .select(selectBase)
        .order("updated_at", { ascending: false });
      if (status) fallback = fallback.eq("status", status);
      if (profileType) fallback = fallback.contains("suggested_profiles", [profileType]);
      const second = await fallback.limit(100);
      data = second.data as unknown[] | null;
      error = second.error;
    }

    if (error) {
      const missing = /worker_registrations|schema cache|does not exist/i.test(error.message);
      if (missing) {
        return NextResponse.json({ workers: [], migrationRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const profileIds = rows
      .map((row) => String(row.profile_id ?? ""))
      .filter(Boolean);
    const credentialsByProfile = new Map<string, Array<Record<string, unknown>>>();

    if (profileIds.length) {
      const { data: credentials, error: credentialsError } = await auth.supabase
        .from("worker_credentials")
        .select("profile_id,status,expires_at,reviewed_at,updated_at")
        .in("profile_id", profileIds);

      if (!credentialsError) {
        for (const credential of credentials ?? []) {
          const profileId = String(credential.profile_id ?? "");
          const list = credentialsByProfile.get(profileId) ?? [];
          list.push(credential as Record<string, unknown>);
          credentialsByProfile.set(profileId, list);
        }
      }
    }

    const workers = rows.map((row) => {
      const profile = (row.profiles ?? {}) as Record<string, unknown>;
      const profileId = String(row.profile_id ?? "");
      const credentials = credentialsByProfile.get(profileId) ?? [];

      return {
        ...row,
        operational_decision: evaluateWorkerOperationalStatus({
          workerStatus: String(row.status ?? ""),
          primaryProfile: String(profile.primary_service_profile ?? ""),
          identityStatus: (profile.identity_status as "none" | "pending" | "approved" | "rejected" | null) ?? null,
          identityVerified: (profile.identity_verified as boolean | null) ?? null,
          biometricVerified: (profile.biometric_verified as boolean | null) ?? null,
          reviewedAt: (row.reviewed_at as string | null) ?? null,
          updatedAt: (row.updated_at as string | null) ?? null,
          credentials: credentials.map((credential) => ({
            status: (credential.status as string | null) ?? null,
            expiresAt: (credential.expires_at as string | null) ?? null,
            reviewedAt: (credential.reviewed_at as string | null) ?? null,
            updatedAt: (credential.updated_at as string | null) ?? null,
          })),
        }),
      };
    });

    return NextResponse.json({ workers, migrationRequired: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
