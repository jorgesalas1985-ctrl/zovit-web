import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { loadOperationalSnapshot } from "@/lib/operations/loadOperationalSnapshot";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireOperationalSnapshotAccess() {
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

export async function GET() {
  try {
    const auth = await requireOperationalSnapshotAccess();
    if ("error" in auth) return auth.error;

    const { snapshot, profiles, error } = await loadOperationalSnapshot(auth.supabase);
    if (error) {
      return NextResponse.json({ error, snapshot, profileCount: profiles.length }, { status: 400 });
    }

    return NextResponse.json(
      {
        snapshot,
        schemaVersion: snapshot.metadata.schemaVersion,
        profileCount: profiles.length,
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
