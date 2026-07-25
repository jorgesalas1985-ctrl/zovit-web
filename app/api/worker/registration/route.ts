import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { pickPrimaryProfile } from "@/lib/worker/classify";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";
import { validateReviewStep } from "@/lib/worker/validate";

function applyServiceLocks(draft: WorkerRegistrationDraft): WorkerRegistrationDraft {
  return {
    ...draft,
    services: draft.services.map((service) => {
      if (!service.requiresCredential) {
        return { ...service, authorizationStatus: "pending" as const };
      }
      return {
        ...service,
        authorizationStatus: "blocked" as const,
      };
    }),
  };
}

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from("worker_registrations")
      .select("draft,status,suggested_profiles,submitted_at,review_message,updated_at")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error) {
      const missingTable = /worker_registrations|schema cache|does not exist/i.test(
        error.message
      );
      return NextResponse.json(
        {
          error: missingTable
            ? "Falta aplicar la migración de trabajadores en Supabase."
            : error.message,
          code: missingTable ? "MIGRATION_REQUIRED" : "QUERY_ERROR",
          hint: "Ejecuta supabase/SPRINT_11_WORKER_PROFILES.sql en el SQL Editor de Supabase.",
        },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "first_name,last_name,rut,phone,address,commune,birth_date,worker_registration_status,primary_service_profile"
      )
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      registration: data,
      profile,
      email: user.email ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as { draft?: WorkerRegistrationDraft };
    if (!body.draft) {
      return NextResponse.json({ error: "Falta el borrador." }, { status: 400 });
    }

    const draft = applyServiceLocks({
      ...body.draft,
      status: body.draft.status === "submitted" ? "submitted" : "draft",
      updatedAt: new Date().toISOString(),
    });

    const primary = pickPrimaryProfile(draft.suggestedProfiles);
    const { supabase, user } = auth;

    const { error } = await supabase.from("worker_registrations").upsert(
      {
        profile_id: user.id,
        draft,
        suggested_profiles: draft.suggestedProfiles,
        status: draft.status === "submitted" ? "submitted" : "draft",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (error) {
      const missingTable = /worker_registrations|schema cache|does not exist/i.test(
        error.message
      );
      return NextResponse.json(
        {
          error: missingTable
            ? "Falta aplicar la migración de trabajadores en Supabase."
            : error.message,
          code: missingTable ? "MIGRATION_REQUIRED" : "QUERY_ERROR",
          hint: "Ejecuta supabase/SPRINT_11_WORKER_PROFILES.sql en el SQL Editor de Supabase.",
        },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: draft.personal.firstName.trim() || null,
        last_name: draft.personal.lastName.trim() || null,
        phone: draft.personal.phone.trim() || null,
        address: draft.personal.address.trim() || null,
        commune: draft.personal.commune.trim() || null,
        birth_date: draft.personal.birthDate || null,
        worker_registration_status: draft.status === "submitted" ? "submitted" : "incomplete",
        primary_service_profile: primary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Si faltan columnas nuevas del sprint, igual devolvemos ok del borrador.
    if (profileError && !/column|schema cache/i.test(profileError.message)) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as { draft?: WorkerRegistrationDraft };
    if (!body.draft) {
      return NextResponse.json({ error: "Falta el borrador." }, { status: 400 });
    }

    const validationError = validateReviewStep(body.draft);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const draft = applyServiceLocks({
      ...body.draft,
      status: "submitted",
      primaryProfile: pickPrimaryProfile(body.draft.suggestedProfiles),
      updatedAt: new Date().toISOString(),
    });

    const { supabase, user } = auth;
    const now = new Date().toISOString();

    const { error } = await supabase.from("worker_registrations").upsert(
      {
        profile_id: user.id,
        draft,
        suggested_profiles: draft.suggestedProfiles,
        status: "submitted",
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "profile_id" }
    );

    if (error) {
      const missingTable = /worker_registrations|schema cache|does not exist/i.test(
        error.message
      );
      return NextResponse.json(
        {
          error: missingTable
            ? "Falta aplicar la migración de trabajadores en Supabase antes de enviar a revisión."
            : error.message,
          code: missingTable ? "MIGRATION_REQUIRED" : "QUERY_ERROR",
          hint: "Ejecuta supabase/SPRINT_11_WORKER_PROFILES.sql en el SQL Editor de Supabase.",
        },
        { status: 400 }
      );
    }

    // Sync credentials + service authorizations
    await supabase.from("worker_credentials").delete().eq("profile_id", user.id);
    if (draft.credentials.length) {
      await supabase.from("worker_credentials").insert(
        draft.credentials.map((cred) => ({
          profile_id: user.id,
          profession: cred.profession,
          institution: cred.institution,
          credential_name: cred.credentialName,
          year_obtained: cred.yearObtained ? Number(cred.yearObtained) || null : null,
          registry_number: cred.registryNumber || null,
          expires_at: cred.expiresAt || null,
          status: "pending",
        }))
      );
    }

    await supabase.from("worker_service_authorizations").delete().eq("profile_id", user.id);
    if (draft.services.length) {
      await supabase.from("worker_service_authorizations").insert(
        draft.services.map((service) => ({
          profile_id: user.id,
          category_slug: service.categorySlug,
          specialty_slug: service.specialtySlug,
          specialty_name: service.specialtyName,
          requires_credential: service.requiresCredential,
          authorization_status: service.requiresCredential ? "blocked" : "pending",
        }))
      );
    }

    const specialties = draft.services.map((s) => s.specialtyName);
    const categories = Array.from(new Set(draft.services.map((s) => s.categoryName)));

    await supabase
      .from("profiles")
      .update({
        first_name: draft.personal.firstName.trim() || null,
        last_name: draft.personal.lastName.trim() || null,
        phone: draft.personal.phone.trim() || null,
        address: draft.personal.address.trim() || null,
        commune: draft.personal.commune.trim() || null,
        birth_date: draft.personal.birthDate || null,
        worker_registration_status: "submitted",
        primary_service_profile: draft.primaryProfile,
        worker_consent_at: now,
        worker_consent_version: "worker-v1",
        service_categories: categories,
        specialties,
        can_act_as_professional: true,
        updated_at: now,
      })
      .eq("id", user.id);

    await supabase.from("worker_review_history").insert({
      profile_id: user.id,
      actor_id: user.id,
      action: "submitted",
      details: {
        suggestedProfiles: draft.suggestedProfiles,
        services: draft.services.length,
      },
    });

    return NextResponse.json({ ok: true, status: "submitted", draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
