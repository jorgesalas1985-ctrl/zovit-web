import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStoragePathForUser } from "@/lib/security/validation";
import { validateAdultBirthDate } from "@/lib/registration/age";
import { chileanDateToIso } from "@/lib/ui/chileanDate";
import { pickPrimaryProfile } from "@/lib/worker/classify";
import {
  isMissingWorkerTableError,
  loadWorkerDraftFallback,
  saveWorkerDraftFallback,
} from "@/lib/worker/registrationFallback";
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

async function syncProfileBasics(
  supabase: SupabaseClient,
  userId: string,
  draft: WorkerRegistrationDraft,
  status: "draft" | "incomplete" | "submitted",
  now = new Date().toISOString()
) {
  const primary = pickPrimaryProfile(draft.suggestedProfiles);
  const specialties = draft.services.map((s) => s.specialtyName);
  const categories = Array.from(new Set(draft.services.map((s) => s.categoryName)));

  const fullUpdate = {
    first_name: draft.personal.firstName.trim() || null,
    last_name: draft.personal.lastName.trim() || null,
    phone: draft.personal.phone.trim() || null,
    address: draft.personal.address.trim() || null,
    commune: draft.personal.commune.trim() || null,
    birth_date: chileanDateToIso(draft.personal.birthDate) || null,
    worker_registration_status: status,
    primary_service_profile: primary,
    worker_consent_at: status === "submitted" ? now : undefined,
    worker_consent_version: status === "submitted" ? "worker-v3" : undefined,
    service_categories: categories.length ? categories : undefined,
    specialties: specialties.length ? specialties : undefined,
    updated_at: now,
  };

  let { error } = await supabase.from("profiles").update(fullUpdate).eq("id", userId);
  if (error && /column|schema cache/i.test(error.message)) {
    ({ error } = await supabase
      .from("profiles")
      .update({
        first_name: fullUpdate.first_name,
        last_name: fullUpdate.last_name,
        phone: fullUpdate.phone,
        address: fullUpdate.address,
        commune: fullUpdate.commune,
        updated_at: now,
        specialties: specialties.length ? specialties : undefined,
        service_categories: categories.length ? categories : undefined,
      })
      .eq("id", userId));
  }

  // Privileges only via service_role (DB trigger blocks self-escalation).
  if (!error && status === "submitted") {
    const admin = createAdminClient();
    const { error: privError } = await admin
      .from("profiles")
      .update({ can_act_as_professional: true, updated_at: now })
      .eq("id", userId);
    if (privError) return privError;
  }

  return error;
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

    if (error && isMissingWorkerTableError(error.message)) {
      const admin = createAdminClient();
      const fallback = await loadWorkerDraftFallback(admin, user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,rut,phone,address,commune,birth_date,worker_registration_status,primary_service_profile"
        )
        .eq("id", user.id)
        .maybeSingle();

      // Sin borrador en storage = no hay registro activo (no inventar aviso en el panel).
      return NextResponse.json({
        registration: fallback
          ? {
              draft: fallback.draft,
              status: fallback.status,
              suggested_profiles: fallback.draft.suggestedProfiles,
              submitted_at: fallback.status === "submitted" ? fallback.draft.updatedAt : null,
              review_message: null,
              updated_at: fallback.draft.updatedAt,
            }
          : null,
        profile,
        email: user.email ?? null,
        storageMode: "fallback",
      });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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

    if (body.draft.personal?.birthDate?.trim()) {
      const ageError = validateAdultBirthDate(body.draft.personal.birthDate);
      if (ageError) {
        return NextResponse.json({ error: ageError }, { status: 400 });
      }
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

    if (error && isMissingWorkerTableError(error.message)) {
      const admin = createAdminClient();
      await saveWorkerDraftFallback(
        admin,
        user.id,
        draft,
        draft.status === "submitted" ? "submitted" : "draft"
      );
      await syncProfileBasics(
        supabase,
        user.id,
        { ...draft, primaryProfile: primary },
        draft.status === "submitted" ? "submitted" : "incomplete"
      );
      return NextResponse.json({ ok: true, draft, storageMode: "fallback" });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const profileError = await syncProfileBasics(
      supabase,
      user.id,
      { ...draft, primaryProfile: primary },
      draft.status === "submitted" ? "submitted" : "incomplete"
    );
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

    const registrationPayload = {
      profile_id: user.id,
      draft,
      suggested_profiles: draft.suggestedProfiles,
      status: "submitted" as const,
      submitted_at: now,
      updated_at: now,
      ai_review_status: "pending",
      ai_review_at: null,
      ai_review_summary: null,
      ai_confidence: null,
      ai_forgery_risk: null,
    };

    let { error } = await supabase
      .from("worker_registrations")
      .upsert(registrationPayload, { onConflict: "profile_id" });

    if (error && /ai_review_|document_mime|column/i.test(error.message)) {
      const { ai_review_status, ai_review_at, ai_review_summary, ai_confidence, ai_forgery_risk, ...base } =
        registrationPayload;
      void ai_review_status;
      void ai_review_at;
      void ai_review_summary;
      void ai_confidence;
      void ai_forgery_risk;
      ({ error } = await supabase
        .from("worker_registrations")
        .upsert(base, { onConflict: "profile_id" }));
    }

    if (error && isMissingWorkerTableError(error.message)) {
      const admin = createAdminClient();
      await saveWorkerDraftFallback(admin, user.id, draft, "submitted");
      await syncProfileBasics(supabase, user.id, draft, "submitted", now);
      return NextResponse.json({
        ok: true,
        status: "submitted",
        draft,
        storageMode: "fallback",
        notice:
          "Registro enviado. Pendiente aplicar SPRINT_11 en Supabase para revisión completa en intranet.",
      });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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
          storage_path: isValidStoragePathForUser(cred.storagePath, user.id)
            ? cred.storagePath
            : null,
          document_mime: cred.documentMime || null,
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

    await syncProfileBasics(supabase, user.id, draft, "submitted", now);

    await supabase.from("worker_review_history").insert({
      profile_id: user.id,
      actor_id: user.id,
      action: "submitted",
      details: {
        suggestedProfiles: draft.suggestedProfiles,
        services: draft.services.length,
      },
    });

    // Revisión IA automática (sin esperar clic de admin).
    void import("@/lib/worker/processWorkerAiBatch")
      .then(({ processWorkerAiReview }) => processWorkerAiReview(user.id))
      .catch((err) => console.error("[worker-ai] post-submit failed", err));

    return NextResponse.json({
      ok: true,
      status: "submitted",
      draft,
      reviewQueued: true,
      aiQueued: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
