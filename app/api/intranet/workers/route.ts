import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isIntranetRole } from "@/lib/auth/intranetRoles";

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

    const selectWithAi =
      "profile_id,status,suggested_profiles,submitted_at,reviewed_at,review_message,updated_at,draft,ai_review_status,ai_confidence,ai_forgery_risk,ai_review_summary, profiles!inner(id,first_name,last_name,rut,commune,primary_service_profile,worker_registration_status)";
    const selectBase =
      "profile_id,status,suggested_profiles,submitted_at,reviewed_at,review_message,updated_at,draft, profiles!inner(id,first_name,last_name,rut,commune,primary_service_profile,worker_registration_status)";

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workers: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
