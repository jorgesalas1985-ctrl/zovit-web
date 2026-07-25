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

    let query = auth.supabase
      .from("worker_registrations")
      .select(
        "profile_id,status,suggested_profiles,submitted_at,reviewed_at,review_message,updated_at,draft, profiles!inner(id,first_name,last_name,rut,commune,primary_service_profile,worker_registration_status)"
      )
      .order("updated_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (profileType) query = query.contains("suggested_profiles", [profileType]);

    const { data, error } = await query.limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workers: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
