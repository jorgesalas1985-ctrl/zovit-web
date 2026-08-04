import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { loadCurrentSemesterClosePreview } from "@/lib/operations/loadCurrentSemesterClosePreview";
import { persistCurrentSemesterClosePreview } from "@/lib/operations/operationalPersistence";
import type { SnapshotCadence } from "@/lib/operations/snapshotArchivePolicy";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_CADENCES: SnapshotCadence[] = [
  "daily",
  "weekly",
  "semester_close",
  "manual",
];

async function requireSemesterCloseArchiveAccess() {
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

  return { supabase, userId: authData.user.id };
}

export async function POST(request: Request) {
  try {
    const auth = await requireSemesterCloseArchiveAccess();
    if ("error" in auth) return auth.error;

    const body = await parseBody(request);
    const cadence = parseCadence(body.cadence ?? null);
    const now = parseNow(body.now ?? null);

    if (body.cadence && !cadence) {
      return NextResponse.json({ error: "Cadencia no valida." }, { status: 400 });
    }

    if (body.now && !now) {
      return NextResponse.json({ error: "Fecha no valida." }, { status: 400 });
    }

    const { preview, profiles, error } = await loadCurrentSemesterClosePreview(
      auth.supabase,
      {
        cadence: cadence ?? "manual",
        now,
      },
    );

    if (error) {
      return NextResponse.json({ error, profileCount: profiles.length }, { status: 400 });
    }

    const persisted = await persistCurrentSemesterClosePreview({
      supabase: auth.supabase,
      preview,
      userId: auth.userId,
    });

    if (persisted.error) {
      return NextResponse.json(
        { error: persisted.error, profileCount: profiles.length },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        archived: true,
        snapshotId: persisted.snapshotId,
        closeRecordId: persisted.closeRecordId,
        profileCount: profiles.length,
        target: preview.target,
        decision: preview.decision,
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

async function parseBody(request: Request): Promise<{
  cadence?: string | null;
  now?: string | null;
}> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

function parseCadence(value: string | null): SnapshotCadence | null {
  if (!value) return null;
  return ALLOWED_CADENCES.includes(value as SnapshotCadence)
    ? (value as SnapshotCadence)
    : null;
}

function parseNow(value: string | null): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}
