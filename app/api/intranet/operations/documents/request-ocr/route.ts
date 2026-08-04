import { isIntranetRole } from "@/lib/auth/intranetRoles";
import type { OperationalDocumentActorType } from "@/lib/operations/documentRenewalPersistence";
import { requestLocalOcrForDocument } from "@/lib/operations/localOcrRequest";
import { isValidUuid } from "@/lib/security/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireRequestOcrAccess() {
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

  return { supabase, userId: authData.user.id, actorType: actorTypeFromRole(role) };
}

export async function POST(request: Request) {
  try {
    const auth = await requireRequestOcrAccess();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const documentId = typeof body.documentId === "string" ? body.documentId : "";

    if (!isValidUuid(documentId)) {
      return NextResponse.json({ error: "Documento invalido." }, { status: 400 });
    }

    const result = await requestLocalOcrForDocument({
      supabase: auth.supabase,
      documentId,
      actorId: auth.userId,
      actorType: auth.actorType,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, document: result.document }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        document: result.document,
        eventId: result.eventId,
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

function actorTypeFromRole(role: string): OperationalDocumentActorType {
  if (role === "super_admin") return "superadmin";
  if (role === "supervisor") return "supervisor";
  return "operations";
}
