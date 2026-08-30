import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function mayReview() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
  return profile?.intranet_role === "hr_admin" || profile?.intranet_role === "super_admin";
}

export async function GET(request: Request) {
  try {
    if (!(await mayReview())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const url = new URL(request.url);
    const admin = createAdminClient();
    let query = admin
      .from("worker_registrations")
      .select("profile_id,status,suggested_profiles,submitted_at,review_message,ai_review_status,ai_confidence,ai_forgery_risk,profiles!inner(id,first_name,last_name,rut,commune,primary_service_profile,worker_registration_status)")
      .order("submitted_at", { ascending: true });
    const status = url.searchParams.get("status");
    const profile = url.searchParams.get("profile");
    if (status) query = query.eq("status", status);
    if (profile) query = query.contains("suggested_profiles", [profile]);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ workers: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la cola." }, { status: 500 });
  }
}
