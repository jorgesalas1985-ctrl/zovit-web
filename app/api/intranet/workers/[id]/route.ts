import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function reviewer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("intranet_role").eq("id", data.user.id).maybeSingle();
  return profile?.intranet_role === "hr_admin" || profile?.intranet_role === "super_admin" ? data.user : null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await reviewer())) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const { id } = await context.params;
    const admin = createAdminClient();
    const [profileResult, registrationResult, credentialResult, serviceResult, authResult] = await Promise.all([
      admin.from("profiles").select("id,first_name,last_name,rut,worker_admin_notes,primary_service_profile").eq("id", id).maybeSingle(),
      admin.from("worker_registrations").select("draft,review_message,status").eq("profile_id", id).maybeSingle(),
      admin.from("worker_credentials").select("id,credential_name,profession,institution,status,storage_path,rejection_reason").eq("profile_id", id),
      admin.from("worker_service_authorizations").select("id,specialty_name,requires_credential,authorization_status").eq("profile_id", id),
      admin.auth.admin.getUserById(id),
    ]);
    const meta = (authResult.data.user?.user_metadata?.zovit_accreditation ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      profile: profileResult.data,
      registration: registrationResult.data,
      credentials: credentialResult.data ?? [],
      services: serviceResult.data ?? [],
      history: [],
      accreditation: meta,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir el expediente." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await reviewer();
    if (!actor) return NextResponse.json({ error: "Acceso no autorizado." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const admin = createAdminClient();
    const { data: target } = await admin.auth.admin.getUserById(id);
    const previous = (target.user?.user_metadata?.zovit_accreditation ?? {}) as Record<string, unknown>;
    const metadata: Record<string, unknown> = { ...previous, updatedAt: new Date().toISOString(), reviewedBy: actor.id };

    if (body.action === "review_credential") {
      const status = body.credentialStatus === "verified" ? "verified" : "rejected";
      const { error } = await admin.from("worker_credentials").update({ status, rejection_reason: body.message ?? null, reviewed_by: actor.id, reviewed_at: new Date().toISOString() }).eq("id", body.credentialId).eq("profile_id", id);
      if (error) throw error;
    } else if (body.action === "record_assessment") {
      const score = Number(body.score);
      if (!Number.isFinite(score) || score < 1 || score > 7) return NextResponse.json({ error: "La nota debe estar entre 1,0 y 7,0." }, { status: 400 });
      const assessments = { ...((previous.assessments ?? {}) as Record<string, unknown>), [String(body.serviceId)]: { score, passed: score >= 4, recordedAt: new Date().toISOString() } };
      metadata.assessments = assessments;
    } else if (body.action === "authorize_service" || body.action === "block_service") {
      const authorization_status = body.action === "authorize_service" ? "authorized" : "blocked";
      const { error } = await admin.from("worker_service_authorizations").update({ authorization_status }).eq("id", body.serviceId).eq("profile_id", id);
      if (error) throw error;
    } else if (body.action === "set_primary_profile") {
      await admin.from("profiles").update({ primary_service_profile: body.primaryProfile }).eq("id", id);
    } else if (body.action === "internal_note") {
      await admin.from("profiles").update({ worker_admin_notes: body.internalNotes }).eq("id", id);
    } else if (["approve", "request_info", "reject"].includes(String(body.action))) {
      const status = body.action === "approve" ? "verified" : body.action === "request_info" ? "needs_info" : "rejected";
      await admin.from("worker_registrations").update({ status, review_message: body.message ?? null, reviewed_by: actor.id, reviewed_at: new Date().toISOString() }).eq("profile_id", id);
      await admin.from("profiles").update({ worker_registration_status: status, primary_service_profile: body.primaryProfile ?? undefined }).eq("id", id);
      metadata.status = status;
    } else {
      return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
    }

    await admin.auth.admin.updateUserById(id, { user_metadata: { ...target.user?.user_metadata, zovit_accreditation: metadata } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la decisión." }, { status: 500 });
  }
}
