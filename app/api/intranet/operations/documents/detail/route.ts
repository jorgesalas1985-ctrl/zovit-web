import { isIntranetRole } from "@/lib/auth/intranetRoles";
import { loadOperationalDocumentDetail } from "@/lib/operations/documentDetail";
import { isValidUuid } from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireDocumentDetailAccess() {
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
    const auth = await requireDocumentDetailAccess();
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId") ?? "";

    if (!isValidUuid(documentId)) {
      return NextResponse.json({ error: "Documento invalido." }, { status: 400 });
    }

    const detail = await loadOperationalDocumentDetail(auth.supabase, documentId);

    if (detail.error) {
      return NextResponse.json({ detail }, { status: 400 });
    }

    return NextResponse.json(
      {
        detail,
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
