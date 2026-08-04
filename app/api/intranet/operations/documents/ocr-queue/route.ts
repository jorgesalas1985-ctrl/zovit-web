import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { loadLocalOcrQueue } from "@/lib/operations/localOcrQueue";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireLocalOcrQueueAccess() {
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
  if (!role || !["hr_admin", "supervisor", "super_admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  return { supabase };
}

export async function GET(request: Request) {
  try {
    const auth = await requireLocalOcrQueueAccess();
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const queue = await loadLocalOcrQueue(auth.supabase, { limit });

    return NextResponse.json(
      { queue },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
