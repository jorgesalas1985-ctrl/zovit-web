import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { loadCurrentSemesterClosePreview } from "@/lib/operations/loadCurrentSemesterClosePreview";
import type { SnapshotCadence } from "@/lib/operations/snapshotArchivePolicy";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_CADENCES: SnapshotCadence[] = [
  "daily",
  "weekly",
  "semester_close",
  "manual",
];

async function requireSemesterClosePreviewAccess() {
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

  return { supabase };
}

export async function GET(request: Request) {
  try {
    const auth = await requireSemesterClosePreviewAccess();
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const cadence = parseCadence(url.searchParams.get("cadence"));
    const now = parseNow(url.searchParams.get("now"));

    if (url.searchParams.has("cadence") && !cadence) {
      return NextResponse.json({ error: "Cadencia no valida." }, { status: 400 });
    }

    if (url.searchParams.has("now") && !now) {
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
      return NextResponse.json({ error, preview, profileCount: profiles.length }, { status: 400 });
    }

    return NextResponse.json(
      {
        preview,
        profileCount: profiles.length,
        schemaVersion: preview.snapshot.metadata.schemaVersion,
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
