import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/security/validation";
import { isIntranetRole } from "@/lib/auth/intranetRoles";
import type { ServiceProfileType, WorkerRegistrationStatus } from "@/lib/worker/types";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireHrReviewer();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const registrationResponse = await auth.supabase
      .from("worker_registrations")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle();
    const { data: credentials } = await auth.supabase.from("worker_credentials").select("*").eq("profile_id", id);
    const { data: services } = await auth.supabase
      .from("worker_service_authorizations")
      .select("*")
      .eq("profile_id", id);
    const { data: history } = await auth.supabase
      .from("worker_review_history")
      .select("*")
      .eq("profile_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: profile } = await auth.supabase
      .from("profiles")
      .select(
        "id,first_name,last_name,rut,phone,address,commune,birth_date,primary_service_profile,worker_registration_status,worker_admin_notes"
      )
      .eq("id", id)
      .maybeSingle();

    return NextResponse.json({
      profile,
      registration: registrationResponse.data,
      credentials: credentials ?? [],
      services: services ?? [],
      history: history ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireHrReviewer();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;

    const body = (await request.json()) as {
      action?:
        | "approve"
        | "reject"
        | "request_info"
        | "clear"
        | "set_primary_profile"
        | "review_credential"
        | "authorize_service"
        | "block_service"
        | "internal_note";
      status?: WorkerRegistrationStatus;
      primaryProfile?: ServiceProfileType;
      message?: string;
      credentialId?: string;
      credentialStatus?: "verified" | "rejected" | "expired" | "pending";
      serviceId?: string;
      authorizationStatus?: "authorized" | "blocked" | "pending" | "revoked";
      internalNotes?: string;
    };

    const now = new Date().toISOString();
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: "Acción requerida." }, { status: 400 });
    }

    if (action === "approve" || action === "reject" || action === "request_info" || action === "clear") {
      if (action === "clear") {
        // Elimina el registro de trabajador: el panel no debe mostrar aviso.
        await auth.supabase.from("worker_registrations").delete().eq("profile_id", id);
        await auth.supabase
          .from("profiles")
          .update({
            worker_registration_status: "draft",
            primary_service_profile: null,
            updated_at: now,
          })
          .eq("id", id);
      } else {
      const status: WorkerRegistrationStatus =
        action === "approve"
          ? "verified"
          : action === "reject"
            ? "rejected"
            : "needs_info";

      await auth.supabase
        .from("worker_registrations")
        .update({
          status,
          reviewed_at: now,
          reviewed_by: auth.user.id,
          review_message: body.message?.trim() || null,
          updated_at: now,
        })
        .eq("profile_id", id);

      await auth.supabase
        .from("profiles")
        .update({
          worker_registration_status: status,
          primary_service_profile: body.primaryProfile ?? undefined,
          updated_at: now,
        })
        .eq("id", id);
      }

      if (action === "approve") {
        await auth.supabase.from("worker_public_badges").upsert(
          [
            { profile_id: id, badge_key: "background_reviewed", granted_by: auth.user.id },
            {
              profile_id: id,
              badge_key:
                body.primaryProfile === "community_collaborator"
                  ? "community_collaborator"
                  : body.primaryProfile === "in_training"
                    ? "in_training"
                    : body.primaryProfile === "experience_verified"
                      ? "experience_proven"
                      : "certification_verified",
              granted_by: auth.user.id,
            },
          ],
          { onConflict: "profile_id,badge_key" }
        );

        await auth.supabase
          .from("worker_service_authorizations")
          .update({ authorization_status: "authorized", updated_at: now })
          .eq("profile_id", id)
          .eq("requires_credential", false);
      }
    }

    if (action === "set_primary_profile" && body.primaryProfile) {
      await auth.supabase
        .from("profiles")
        .update({ primary_service_profile: body.primaryProfile, updated_at: now })
        .eq("id", id);
    }

    if (action === "review_credential" && body.credentialId && body.credentialStatus) {
      await auth.supabase
        .from("worker_credentials")
        .update({
          status: body.credentialStatus,
          reviewed_by: auth.user.id,
          reviewed_at: now,
          rejection_reason: body.message?.trim() || null,
          updated_at: now,
        })
        .eq("id", body.credentialId)
        .eq("profile_id", id);

      if (body.credentialStatus === "verified") {
        await auth.supabase
          .from("worker_service_authorizations")
          .update({ authorization_status: "authorized", updated_at: now })
          .eq("profile_id", id)
          .eq("requires_credential", true);
      }
    }

    if (action === "authorize_service" || action === "block_service") {
      if (!body.serviceId) {
        return NextResponse.json({ error: "serviceId requerido." }, { status: 400 });
      }
      await auth.supabase
        .from("worker_service_authorizations")
        .update({
          authorization_status:
            body.authorizationStatus ??
            (action === "authorize_service" ? "authorized" : "blocked"),
          updated_at: now,
        })
        .eq("id", body.serviceId)
        .eq("profile_id", id);
    }

    if (action === "internal_note" && body.internalNotes !== undefined) {
      await auth.supabase
        .from("profiles")
        .update({ worker_admin_notes: body.internalNotes, updated_at: now })
        .eq("id", id);
    }

    await auth.supabase.from("worker_review_history").insert({
      profile_id: id,
      actor_id: auth.user.id,
      action,
      details: body,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
