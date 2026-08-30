import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMissingWorkerTableError,
  loadWorkerDraftFallback,
  saveWorkerDraftFallback,
} from "@/lib/worker/registrationFallback";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

function validDraft(value: unknown): value is WorkerRegistrationDraft {
  return Boolean(value && typeof value === "object" && "personal" in value && "services" in value);
}

async function authenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET() {
  try {
    const { supabase, user } = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

    const { data, error } = await supabase
      .from("worker_registrations")
      .select("draft,status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name,rut,phone,address,commune,birth_date")
        .eq("id", user.id)
        .maybeSingle();
      return NextResponse.json({
        registration: data ?? null,
        profile: profile ?? null,
        email: user.email ?? null,
      });
    }
    if (!isMissingWorkerTableError(error.message)) throw error;

    const fallback = await loadWorkerDraftFallback(createAdminClient(), user.id);
    return NextResponse.json({ registration: fallback, email: user.email ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el registro." },
      { status: 500 },
    );
  }
}

async function save(request: Request, submitted: boolean) {
  try {
    const { supabase, user } = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

    const body = (await request.json()) as { draft?: unknown };
    if (!validDraft(body.draft)) {
      return NextResponse.json({ error: "Los datos del registro no son válidos." }, { status: 400 });
    }

    const status = submitted ? "submitted" : body.draft.status === "submitted" ? "submitted" : "draft";
    const draft: WorkerRegistrationDraft = {
      ...body.draft,
      status,
      updatedAt: new Date().toISOString(),
    };
    const row = {
      profile_id: user.id,
      draft,
      suggested_profiles: draft.suggestedProfiles ?? [],
      status,
      submitted_at: submitted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("worker_registrations").upsert(row, {
      onConflict: "profile_id",
    });

    if (error) {
      if (!isMissingWorkerTableError(error.message)) throw error;
      await saveWorkerDraftFallback(createAdminClient(), user.id, draft, status);
    }

    return NextResponse.json({
      draft,
      status,
      notice: submitted ? "Registro enviado correctamente para revisión." : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el registro." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return save(request, false);
}

export async function POST(request: Request) {
  return save(request, true);
}
